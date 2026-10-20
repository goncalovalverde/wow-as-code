import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CheckContext, CheckResult, VerifySpec } from "./types.js";
import { fail, pass } from "./common.js";
import { LIMITS } from "./limits.js";

const execFileAsync = promisify(execFile);

export async function checkCommand(
  spec: Extract<VerifySpec, { check: "command" }>,
  context: CheckContext
): Promise<CheckResult> {
  if (context.provenance !== "local") {
    return { verdict: "skipped", evidence: `Commands are never run for inherited rules (from ${context.provenance})` };
  }
  if (!context.allowCommands) {
    return { verdict: "skipped", evidence: "Command checks require --allow-commands" };
  }

  const [executable, ...args] = spec.argv;
  const expected = spec.expect_exit ?? 0;
  try {
    await execFileAsync(executable, args, { cwd: context.root, timeout: LIMITS.commandTimeoutMs });
    return expected === 0 ? pass(`${executable} exited 0`) : fail(`${executable} exited 0, expected ${expected}`);
  } catch (error) {
    const failure = error as { code?: unknown; stderr?: string; message: string };
    if (typeof failure.code === "number") {
      if (failure.code === expected) return pass(`${executable} exited ${expected}`);
      const output = failure.stderr?.trim().split("\n").slice(-3).join(" | ");
      return fail(`${executable} exit ${failure.code}, expected ${expected}${output ? `: ${output}` : ""}`);
    }
    return fail(`Could not run ${executable}: ${failure.message.split("\n")[0]}`);
  }
}
