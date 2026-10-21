import { join } from "node:path";
import { loadConfig } from "../config.js";
import { loadWorkflows, type LoadedWorkflows } from "./load.js";

/** Loads the workflows listed in <wowDir>/config.yaml. */
export async function loadWorkflowsFromDir(wowDir: string): Promise<LoadedWorkflows> {
  const config = await loadConfig(join(wowDir, "config.yaml"));
  return loadWorkflows(wowDir, config);
}
