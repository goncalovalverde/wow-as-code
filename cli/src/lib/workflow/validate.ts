import { getSchemaValidator } from "../schema.js";
import type { ResolvedRule, ValidationDiagnostic } from "../types.js";
import type { Workflow } from "./types.js";

const diag = (level: "error" | "warning", file: string, message: string): ValidationDiagnostic => ({ level, file, message });

async function schemaDiagnostics(workflow: Workflow): Promise<ValidationDiagnostic[]> {
  const validate = await getSchemaValidator("workflow-schema.json");
  if (validate(workflow.frontmatter)) return [];
  return (validate.errors ?? []).map((err) =>
    diag("error", workflow.filePath, `${err.instancePath || "root"} ${err.message}`)
  );
}

function hasIndependentVerifier(rule: ResolvedRule): boolean {
  const type = rule.frontmatter.verify?.type;
  return type === "deterministic" || type === "human";
}

function phaseDiagnostics(workflow: Workflow, rules: Map<string, ResolvedRule>): ValidationDiagnostic[] {
  const out: ValidationDiagnostic[] = [];
  const seen = new Set<string>();
  const produced = new Set<string>();

  for (const phase of workflow.frontmatter.phases) {
    const where = `phase "${phase.id}"`;
    if (seen.has(phase.id)) out.push(diag("error", workflow.filePath, `Duplicate phase id "${phase.id}"`));
    seen.add(phase.id);

    for (const input of phase.inputs ?? []) {
      if (!produced.has(input)) {
        out.push(diag("warning", workflow.filePath, `${where} needs "${input}", which no earlier phase produces (external input?)`));
      }
    }

    for (const ruleId of phase.gate?.rules ?? []) {
      const rule = rules.get(ruleId);
      if (!rule) {
        out.push(diag("error", workflow.filePath, `${where} gate references unknown rule "${ruleId}"`));
      } else if (
        phase.performer === "agent" &&
        rule.frontmatter.enforcement === "hard" &&
        !hasIndependentVerifier(rule) &&
        phase.gate?.approval !== "human"
      ) {
        out.push(
          diag("error", workflow.filePath, `${where} is performed by an agent and gated by hard rule "${ruleId}" with no deterministic or human verifier; set gate.approval: human`)
        );
      }
    }
    (phase.outputs ?? []).forEach((output) => produced.add(output));
  }
  return out;
}

export async function validateWorkflows(workflows: Workflow[], rules: ResolvedRule[]): Promise<ValidationDiagnostic[]> {
  const byId = new Map(rules.map((rule) => [rule.frontmatter.id, rule]));
  const out: ValidationDiagnostic[] = [];
  for (const workflow of workflows) {
    const schemaErrors = await schemaDiagnostics(workflow);
    out.push(...schemaErrors);
    if (schemaErrors.length === 0) out.push(...phaseDiagnostics(workflow, byId));
  }
  return out;
}
