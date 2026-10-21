import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { filterRules } from "../query.js";
import { renderRuleSections } from "../sync/render.js";
import type { ResolvedRule } from "../types.js";
import { renderWorkflows } from "../workflow/render.js";
import type { Workflow } from "../workflow/types.js";

export interface LoadedRules {
  rules: ResolvedRule[];
  warnings: string[];
}

export type RuleLoader = () => Promise<LoadedRules>;
export type WorkflowLoader = () => Promise<Workflow[]>;

const READ_ONLY = { readOnlyHint: true, idempotentHint: true, openWorldHint: false } as const;

const enforcementSchema = z.enum(["hard", "soft", "info"]);
const categorySchema = z.enum(["quality", "architecture", "delivery", "collaboration"]);

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

const text = (value: string, isError = false): ToolResult => ({
  content: [{ type: "text", text: value }],
  ...(isError ? { isError: true } : {}),
});

function summarize(rule: ResolvedRule) {
  const { id, title, category, enforcement, applies_to, rationale } = rule.frontmatter;
  return { id, title, category, enforcement, applies_to, rationale, provenance: rule.provenance };
}

function withWarnings(body: string, warnings: string[]): string {
  if (warnings.length === 0) return body;
  const notice = warnings.map((warning) => `> ⚠ ${warning}`).join("\n");
  return `${notice}\n\n${body}`;
}

async function guarded(load: RuleLoader, run: (loaded: LoadedRules) => ToolResult): Promise<ToolResult> {
  try {
    return run(await load());
  } catch (error) {
    return text(`Failed to load wow/ rules: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}

export function createWowServer(load: RuleLoader, loadWorkflowList: WorkflowLoader = async () => []): McpServer {
  const server = new McpServer({ name: "wow-as-code", version: "0.1.0" });

  server.registerTool(
    "list_rules",
    {
      description:
        "List team ways-of-working rules (summaries only). Filter by trigger (e.g. pr, commit, code-generation) to see what applies right now.",
      inputSchema: {
        trigger: z.string().optional().describe("Trigger, e.g. pr, commit, code-generation, onboarding"),
        enforcement: enforcementSchema.optional(),
        category: categorySchema.optional(),
      },
      annotations: READ_ONLY,
    },
    (filter) =>
      guarded(load, ({ rules, warnings }) =>
        text(withWarnings(JSON.stringify(filterRules(rules, filter).map(summarize), null, 2), warnings))
      )
  );

  server.registerTool(
    "get_rule",
    {
      description: "Get one rule in full (frontmatter and body) by id.",
      inputSchema: { id: z.string().describe("Rule id, e.g. code-review") },
      annotations: READ_ONLY,
    },
    ({ id }) =>
      guarded(load, ({ rules, warnings }) => {
        const [rule] = filterRules(rules, { id });
        if (!rule) {
          const known = rules.map((r) => r.frontmatter.id).join(", ");
          return text(`Rule "${id}" not found. Known rules: ${known || "none"}`, true);
        }
        const payload = {
          ...summarize(rule),
          owner: rule.frontmatter.owner,
          verify: rule.frontmatter.verify,
          body: rule.body,
        };
        return text(withWarnings(JSON.stringify(payload, null, 2), warnings));
      })
  );

  server.registerTool(
    "get_context",
    {
      description:
        "Get the rules that apply to a trigger as ready-to-follow markdown (hard rules first). Call this before creating a PR, committing, or generating code.",
      inputSchema: { trigger: z.string().describe("Trigger, e.g. pr, commit, code-generation, onboarding") },
      annotations: READ_ONLY,
    },
    ({ trigger }) =>
      guarded(load, ({ rules, warnings }) => {
        const matching = filterRules(rules, { trigger });
        const body =
          matching.length === 0
            ? `No rules apply to trigger "${trigger}".`
            : `# Ways of Working for "${trigger}"\n\n${renderRuleSections(matching)}\n`;
        return text(withWarnings(body, warnings));
      })
  );

  server.registerTool(
    "list_workflows",
    {
      description: "List team workflows (summaries). A workflow is an ordered set of phases performed by humans, agents or both.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    () =>
      guardedWorkflows(loadWorkflowList, (workflows) =>
        text(
          JSON.stringify(
            workflows.map(({ frontmatter }) => ({
              id: frontmatter.id,
              title: frontmatter.title,
              description: frontmatter.description,
              phases: frontmatter.phases.length,
            })),
            null,
            2
          )
        )
      )
  );

  server.registerTool(
    "get_workflow",
    {
      description: "Get one workflow by id as markdown: phases, who performs each, artifacts, and exit gates.",
      inputSchema: { id: z.string().describe("Workflow id, e.g. spec-driven") },
      annotations: READ_ONLY,
    },
    ({ id }) =>
      guardedWorkflows(loadWorkflowList, (workflows) => {
        const match = workflows.filter((workflow) => workflow.frontmatter.id === id);
        if (match.length === 0) {
          const known = workflows.map((workflow) => workflow.frontmatter.id).join(", ");
          return text(`Workflow "${id}" not found. Known workflows: ${known || "none"}`, true);
        }
        return text(renderWorkflows(match));
      })
  );

  return server;
}

async function guardedWorkflows(load: WorkflowLoader, run: (workflows: Workflow[]) => ToolResult): Promise<ToolResult> {
  try {
    return run(await load());
  } catch (error) {
    return text(`Failed to load workflows: ${error instanceof Error ? error.message : String(error)}`, true);
  }
}
