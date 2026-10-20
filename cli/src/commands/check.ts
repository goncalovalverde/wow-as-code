import { Command } from "commander";
import { resolve } from "node:path";
import { resolveRules } from "../lib/load.js";
import { createSourceProvider } from "../lib/sources.js";
import { runChecks, shouldFail } from "../lib/verify/run.js";
import type { CheckReport, Verdict } from "../lib/verify/types.js";
import type { OutputFormat } from "../lib/types.js";

const ICONS: Record<Verdict, string> = { pass: "✓", fail: "✗", skipped: "–", "needs-human": "?" };

function renderText(report: CheckReport, explain: boolean): void {
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

export const checkCommand = new Command("check")
  .description("Verify the repository against rules that declare a verify: block")
  .option("-d, --dir <path>", "wow directory path", "wow")
  .option("-r, --root <path>", "repository root to check", ".")
  .option("-t, --trigger <trigger>", "only check rules that apply to a trigger (e.g. pr)")
  .option("--allow-commands", "run command checks (local rules only)")
  .option("--regex-timeout <ms>", "abort a regex check on one file after this many ms", "1000")
  .option("--strict", "also fail on soft-rule failures and on hard rules that need a human")
  .option("--explain", "show evidence and provenance for every result")
  .option("-f, --format <format>", "output format (text|json)", "text")
  .action(async (options) => {
    const format: OutputFormat = options.format;
    const regexTimeoutMs = Number(options.regexTimeout);
    if (!Number.isInteger(regexTimeoutMs) || regexTimeoutMs < 1) {
      console.error("--regex-timeout must be a positive integer (milliseconds)");
      process.exit(2);
    }
    const provider = createSourceProvider();
    const { rules, warnings } = await resolveRules(resolve(process.cwd(), options.dir), provider).finally(() =>
      provider.dispose?.()
    );
    warnings.forEach((warning) => console.error(`⚠ ${warning}`));

    const report = await runChecks(
      rules,
      {
        root: resolve(process.cwd(), options.root),
        allowCommands: Boolean(options.allowCommands),
        regexTimeoutMs,
      },
      { trigger: options.trigger }
    );

    if (format === "json") {
      console.log(JSON.stringify({ ...report, warnings }, null, 2));
    } else {
      renderText(report, Boolean(options.explain));
    }

    if (shouldFail(report, Boolean(options.strict))) process.exit(1);
  });
