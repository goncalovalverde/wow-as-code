import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type { ValidationDiagnostic, WoWConfig } from "../types.js";
import { parseWorkflow } from "./parse.js";
import type { Workflow } from "./types.js";

export interface LoadedWorkflows {
  workflows: Workflow[];
  diagnostics: ValidationDiagnostic[];
}

const error = (file: string, message: string): ValidationDiagnostic => ({ level: "error", file, message });

function insideDir(dir: string, path: string): string | undefined {
  const absolute = resolve(dir, path);
  const rel = relative(dir, absolute);
  return rel.startsWith("..") || isAbsolute(rel) ? undefined : absolute;
}

/** Loads workflows listed in config.yaml; problems become diagnostics, never exceptions. */
export async function loadWorkflows(wowDir: string, config: WoWConfig): Promise<LoadedWorkflows> {
  const workflows: Workflow[] = [];
  const diagnostics: ValidationDiagnostic[] = [];

  for (const entry of config.workflows ?? []) {
    const absolute = insideDir(wowDir, entry.path);
    if (!absolute) {
      diagnostics.push(error(entry.path, `Workflow path "${entry.path}" is outside the wow directory`));
      continue;
    }
    try {
      const workflow = parseWorkflow(await readFile(absolute, "utf-8"), entry.path);
      if (workflow.frontmatter.id !== entry.id) {
        diagnostics.push(
          error(entry.path, `ID mismatch: config.yaml says "${entry.id}" but frontmatter says "${workflow.frontmatter.id}"`)
        );
        continue;
      }
      workflows.push(workflow);
    } catch (cause) {
      diagnostics.push(error(entry.path, cause instanceof Error ? cause.message : "Failed to read workflow"));
    }
  }
  return { workflows, diagnostics };
}
