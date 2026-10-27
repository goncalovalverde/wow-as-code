import { join } from "node:path";
import { loadConfig } from "./config.js";
import { resolveRules, type ResolveResult } from "./load.js";
import type { SourceProvider } from "./resolver.js";
import type { ValidationDiagnostic, WoWConfig } from "./types.js";
import { loadWorkflows } from "./workflow/load.js";
import type { Workflow } from "./workflow/types.js";

export interface ProjectResult extends ResolveResult {
  config: WoWConfig;
  workflows: Workflow[];
  workflowDiagnostics: ValidationDiagnostic[];
}

/** Resolves rules and loads workflows in one pass; every command that needs both should use this. */
export async function loadProject(wowDir: string, provider: SourceProvider): Promise<ProjectResult> {
  const config = await loadConfig(join(wowDir, "config.yaml"));
  const [resolved, loaded] = await Promise.all([resolveRules(wowDir, provider), loadWorkflows(wowDir, config)]);
  return { ...resolved, config, workflows: loaded.workflows, workflowDiagnostics: loaded.diagnostics };
}
