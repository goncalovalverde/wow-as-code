import { Command } from "commander";
import { resolve } from "node:path";
import { filterRules } from "../lib/query.js";
import { loadProject } from "../lib/project.js";
import { createSourceProvider } from "../lib/sources.js";
import { renderWorkflows } from "../lib/workflow/render.js";
import type { OutputFormat, ResolvedRule } from "../lib/types.js";

export const showCommand = new Command("show")
  .description("Display resolved wow/ rules with provenance")
  .option("-d, --dir <path>", "wow directory path", "wow")
  .option("-f, --format <format>", "output format (text|json)", "text")
  .option("--id <id>", "show a single rule by ID")
  .option("-t, --trigger <trigger>", "show only rules that apply to a trigger (e.g. pr, commit)")
  .option("--workflows", "show workflows instead of rules")
  .action(async (options) => {
    const format: OutputFormat = options.format;
    const wowDir = resolve(process.cwd(), options.dir);

    const provider = createSourceProvider();
    const project = await loadProject(wowDir, provider).finally(() => provider.dispose?.());
    project.warnings.forEach((warning) => console.error(`⚠ ${warning}`));
    project.workflowDiagnostics.forEach((item) => console.error(`⚠ [${item.file}] ${item.message}`));

    if (options.workflows) {
      const shown = options.id
        ? project.workflows.filter((workflow) => workflow.frontmatter.id === options.id)
        : project.workflows;
      if (shown.length === 0) {
        console.error(options.id ? `Workflow "${options.id}" not found.` : "No workflows found.");
        process.exit(1);
      }
      console.log(format === "json" ? JSON.stringify(shown, null, 2) : renderWorkflows(shown));
      return;
    }

    const resolved = project.rules;

    // Filter by ID if requested
    const output = filterRules(resolved, { id: options.id, trigger: options.trigger });

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
