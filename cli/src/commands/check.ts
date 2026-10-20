import { Command } from "commander";
import { resolve } from "node:path";
import { resolveRules } from "../lib/load.js";
import { createSourceProvider } from "../lib/sources.js";
import { runChecks, shouldFail } from "../lib/verify/run.js";
import { parseRegexTimeout } from "../lib/verify/options.js";
import { renderText } from "../lib/verify/render.js";
import type { OutputFormat } from "../lib/types.js";

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
    const regexTimeoutMs = parseRegexTimeout(options.regexTimeout);
    if (regexTimeoutMs === undefined) {
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
