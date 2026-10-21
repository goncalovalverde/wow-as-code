import type { Workflow, WorkflowPhase } from "./types.js";

function describeGate(phase: WorkflowPhase): string | undefined {
  const parts: string[] = [];
  if (phase.gate?.rules?.length) parts.push(`rules ${phase.gate.rules.join(", ")}`);
  if (phase.gate?.approval === "human") parts.push("human approval");
  return parts.length > 0 ? `gate: ${parts.join(", ")}` : undefined;
}

function describePhase(phase: WorkflowPhase, position: number): string {
  const details = [
    `performed by ${phase.performer}`,
    phase.inputs?.length ? `needs ${phase.inputs.join(", ")}` : undefined,
    phase.outputs?.length ? `produces ${phase.outputs.join(", ")}` : undefined,
    describeGate(phase),
  ].filter(Boolean);
  return `${position}. **${phase.name}** (${phase.id}) — ${details.join("; ")}`;
}

function renderWorkflow(workflow: Workflow): string {
  const { id, title, description, phases } = workflow.frontmatter;
  const lines = [`## Workflow: ${title} (${id})`, ""];
  if (description) lines.push(description, "");
  lines.push(...phases.map((phase, index) => describePhase(phase, index + 1)));
  if (workflow.body) lines.push("", workflow.body.replace(/^# .*\n+/, "").trim());
  return lines.join("\n");
}

export function renderWorkflows(workflows: Workflow[]): string {
  return [...workflows]
    .sort((left, right) => left.frontmatter.id.localeCompare(right.frontmatter.id))
    .map(renderWorkflow)
    .join("\n\n");
}
