import { filterRules } from "../query.js";
import type { ResolvedRule } from "../types.js";
import { runCheck } from "./checks.js";
import type { CheckContext, CheckReport, RuleResult, Verdict } from "./types.js";

export interface RunOptions {
  trigger?: string;
}

function verifierName(rule: ResolvedRule): string {
  const spec = rule.frontmatter.verify;
  if (!spec) return "none";
  return spec.type === "deterministic" ? `deterministic:${spec.check}` : spec.type;
}

export async function runChecks(
  rules: ResolvedRule[],
  context: Omit<CheckContext, "provenance"> & { provenance?: string },
  options: RunOptions = {}
): Promise<CheckReport> {
  const selected = filterRules(rules, { trigger: options.trigger });
  const summary: CheckReport["summary"] = { pass: 0, fail: 0, skipped: 0, "needs-human": 0, unverified: 0 };
  const results: RuleResult[] = [];

  for (const rule of selected) {
    const { verify, id, enforcement } = rule.frontmatter;
    if (!verify) {
      summary.unverified += 1;
      continue;
    }
    const outcome = await runCheck(verify, { ...context, provenance: rule.provenance });
    summary[outcome.verdict as Verdict] += 1;
    results.push({
      ruleId: id,
      enforcement,
      verifier: verifierName(rule),
      provenance: rule.provenance,
      ...outcome,
    });
  }

  return { summary, results };
}

/** A failing hard rule always fails the run; strict also fails soft failures and unverifiable hard rules. */
export function shouldFail(report: CheckReport, strict: boolean): boolean {
  return report.results.some((result) => {
    if (result.verdict === "fail") return strict || result.enforcement === "hard";
    return strict && result.enforcement === "hard" && result.verdict === "needs-human";
  });
}
