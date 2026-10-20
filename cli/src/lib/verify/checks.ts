import type { CheckContext, CheckResult, VerifySpec } from "./types.js";
import { checkCommand } from "./command-check.js";
import { checkFile } from "./file-check.js";
import { checkPattern } from "./pattern-check.js";

export async function runCheck(spec: VerifySpec, context: CheckContext): Promise<CheckResult> {
  switch (spec.type) {
    case "human":
      return { verdict: "needs-human", evidence: spec.instructions };
    case "llm":
      return { verdict: "skipped", evidence: "LLM verifiers are advisory; an agent must evaluate this rule" };
    case "deterministic":
      if (spec.check === "pattern") return checkPattern(spec, context);
      if (spec.check === "command") return checkCommand(spec, context);
      return checkFile(spec, context);
  }
}
