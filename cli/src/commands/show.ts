import { Command } from "commander";
import { resolve } from "node:path";
import { resolveRules } from "../lib/load.js";
import { FilesystemSourceProvider } from "../lib/resolver.js";
import type { OutputFormat, ResolvedRule } from "../lib/types.js";

export const showCommand = new Command("show")
  .description("Display resolved wow/ rules with provenance")
  .option("-d, --dir <path>", "wow directory path", "wow")
  .option("-f, --format <format>", "output format (text|json)", "text")
  .option("--id <id>", "show a single rule by ID")
  .action(async (options) => {
    const format: OutputFormat = options.format;
    const wowDir = resolve(process.cwd(), options.dir);

    const { rules: resolved, warnings } = await resolveRules(wowDir, new FilesystemSourceProvider());
    warnings.forEach((warning) => console.error(`⚠ ${warning}`));

    // Filter by ID if requested
    const output = options.id
      ? resolved.filter((r) => r.frontmatter.id === options.id)
      : resolved;

    if (output.length === 0) {
      console.error(options.id ? `Rule "${options.id}" not found.` : "No rules found.");
      process.exit(1);
    }

    renderOutput(output, format);
  });

function renderOutput(rules: ResolvedRule[], format: OutputFormat): void {
  if (format === "json") {
    console.log(JSON.stringify(rules, null, 2));
    return;
  }

  for (const rule of rules) {
    const { frontmatter, provenance, overriddenBy } = rule;
    console.log(`─── ${frontmatter.title} (${frontmatter.id}) ───`);
    console.log(`  Category:    ${frontmatter.category}`);
    console.log(`  Enforcement: ${frontmatter.enforcement}`);
    console.log(`  Owner:       ${frontmatter.owner}`);
    console.log(`  Triggers:    ${frontmatter.applies_to.join(", ")}`);
    console.log(`  Provenance:  ${provenance}`);
    if (overriddenBy) {
      console.log(`  Overrides:   ${overriddenBy}`);
    }
    console.log(`  Reviewed:    ${frontmatter.last_reviewed}`);
    if (frontmatter.tags?.length) {
      console.log(`  Tags:        ${frontmatter.tags.join(", ")}`);
    }
    console.log();
  }
}
