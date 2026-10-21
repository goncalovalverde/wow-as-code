import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { WoWFile, ValidationDiagnostic, ValidationResult } from "./types.js";

type Validator = ReturnType<Ajv["compile"]>;
const validators = new Map<string, Validator>();

/** Compiles a spec schema by file name, looking next to the bundle first, then in the repo's spec/. */
export async function getSchemaValidator(fileName: string): Promise<Validator> {
  const cached = validators.get(fileName);
  if (cached) return cached;

  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    resolve(here, fileName),
    resolve(here, "..", fileName),
    resolve(here, "../../spec", fileName),
    resolve(here, "../../../spec", fileName),
  ];

  let schema: object | null = null;
  for (const schemaPath of candidates) {
    try {
      schema = JSON.parse(await readFile(schemaPath, "utf-8"));
      break;
    } catch {
      continue;
    }
  }

  if (!schema) {
    throw new Error(`Cannot load ${fileName}. Ensure spec/${fileName} exists in the repo root.`);
  }

  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validator = ajv.compile(schema);
  validators.set(fileName, validator);
  return validator;
}

const getValidator = () => getSchemaValidator("schema.json");

export async function validateFrontmatter(
  file: WoWFile
): Promise<ValidationDiagnostic[]> {
  const validate = await getValidator();
  const valid = validate(file.frontmatter);

  if (valid) return [];

  return (validate.errors ?? []).map((err) => ({
    level: "error" as const,
    file: file.filePath,
    message: `${err.instancePath || "root"} ${err.message}`,
    field: err.instancePath?.replace("/", "") || undefined,
  }));
}

export async function validateFiles(
  files: WoWFile[]
): Promise<ValidationResult> {
  const diagnostics: ValidationDiagnostic[] = [];

  for (const file of files) {
    const fileDiags = await validateFrontmatter(file);
    diagnostics.push(...fileDiags);
  }

  return {
    valid: diagnostics.filter((d) => d.level === "error").length === 0,
    diagnostics,
  };
}
