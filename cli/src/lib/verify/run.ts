import { filterRules } from "../query.js";
import type { ResolvedRule } from "../types.js";
import { runCheck } from "./checks.js";
import type { CheckContext, CheckReport, RuleResult, Verdict, VerifySpec } from "./types.js";

export interface RunOptions {
  trigger?: string;
}

function verifierName(rule: ResolvedRule): string {
  const spec = rule.frontmatter.verify;
  if (!spec) return "none";
  return spec.type === "deterministic" ? `deterministic:${spec.check}` : spec.type;
}

const isCommandCheck = (rule: ResolvedRule): boolean => {
  const spec = rule.frontmatter.verify;
  return spec?.type === "deterministic" && spec.check === "command";
};

async function evaluate(
  rule: ResolvedRule,
  context: Omit<CheckContext, "provenance"> & { provenance?: string }
): Promise<RuleResult> {
  const outcome = await runCheck(rule.frontmatter.verify as VerifySpec, { ...context, provenance: rule.provenance });
  return {
    ruleId: rule.frontmatter.id,
    enforcement: rule.frontmatter.enforcement,
    verifier: verifierName(rule),
    provenance: rule.provenance,
    ...outcome,
  };
}

/** Read-only checks run in parallel; command checks run one at a time since they may touch shared state. */
export async function runChecks(
  rules: ResolvedRule[],
  context: Omit<CheckContext, "provenance"> & { provenance?: string },
  options: RunOptions = {}
): Promise<CheckReport> {
  const selected = filterRules(rules, { trigger: options.trigger });
  const verified = selected.filter((rule) => rule.frontmatter.verify);
  const summary: CheckReport["summary"] = {
    pass: 0, fail: 0, skipped: 0, "needs-human": 0,
    unverified: selected.length - verified.length,
  };

  const outcomes = new Map<ResolvedRule, RuleResult>();
  await Promise.all(
    verified.filter((rule) => !isCommandCheck(rule)).map(async (rule) => outcomes.set(rule, await evaluate(rule, context)))
  );
  for (const rule of verified.filter(isCommandCheck)) outcomes.set(rule, await evaluate(rule, context));

  const results = verified.map((rule) => outcomes.get(rule) as RuleResult);
  results.forEach((result) => (summary[result.verdict as Verdict] += 1));
  return { summary, results };
}

/** A failing hard rule always fails the run; strict also fails soft failures and unverifiable hard rules. */
export function shouldFail(report: CheckReport, strict: boolean): boolean {
  return report.results.some((result) => {
    if (result.verdict === "fail") return strict || result.enforcement === "hard";
    return strict && result.enforcement === "hard" && result.verdict === "needs-human";
  });
}
