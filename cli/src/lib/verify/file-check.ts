import type { CheckContext, CheckResult, VerifySpec } from "./types.js";
import { exists, fail, insideRoot, pass } from "./common.js";

export async function checkFile(spec: Extract<VerifySpec, { check: "file-exists" | "file-absent" }>, context: CheckContext): Promise<CheckResult> {
  const absolute = insideRoot(context.root, spec.path);
  if (!absolute) return fail(`Path "${spec.path}" is outside the repository root`);

  const present = await exists(absolute);
  if (spec.check === "file-exists") {
    return present ? pass(`${spec.path} exists`) : fail(`${spec.path} is missing`);
  }
  return present ? fail(`${spec.path} must not exist`) : pass(`${spec.path} is absent`);
}
