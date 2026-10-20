import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { WoWFile, ValidationDiagnostic, ValidationResult } from "./types.js";

let schemaValidator: ReturnType<Ajv["compile"]> | null = null;

async function getValidator(): Promise<ReturnType<Ajv["compile"]>> {
  if (schemaValidator) return schemaValidator;

  // Try multiple schema locations: bundled with CLI, then repo-relative
  const candidates = [
    resolve(dirname(fileURLToPath(import.meta.url)), "../schema.json"),
    resolve(dirname(fileURLToPath(import.meta.url)), "../../spec/schema.json"),
  ];

  let schema: object | null = null;
  for (const schemaPath of candidates) {
    try {
      const raw = await readFile(schemaPath, "utf-8");
      schema = JSON.parse(raw);
      break;
    } catch {
      continue;
    }
  }

  if (!schema) {
    throw new Error(
      "Cannot load schema.json. Ensure spec/schema.json exists in the repo root."
    );
  }

  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  schemaValidator = ajv.compile(schema);
  return schemaValidator;
}

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
