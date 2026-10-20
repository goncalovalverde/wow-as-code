import type { CheckReport, Verdict } from "./types.js";

const ICONS: Record<Verdict, string> = { pass: "✓", fail: "✗", skipped: "–", "needs-human": "?" };

export function renderText(report: CheckReport, explain: boolean): void {
  for (const result of report.results) {
    const line = `${ICONS[result.verdict]} ${result.verdict.padEnd(11)} [${result.enforcement}] ${result.ruleId} (${result.verifier})`;
    console.log(line);
    if (explain || result.verdict !== "pass") console.log(`    ${result.evidence}`);
    if (explain) console.log(`    from: ${result.provenance}`);
  }
  const { pass, fail, skipped, unverified } = report.summary;
  const human = report.summary["needs-human"];
  console.log(
    `\n${pass} passed, ${fail} failed, ${human} need a human, ${skipped} skipped, ${unverified} without a verifier`
  );
}
