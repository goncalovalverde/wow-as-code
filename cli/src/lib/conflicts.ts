import type { InheritanceLayer } from "./resolver.js";
import type { ResolvedRule, ValidationDiagnostic } from "./types.js";

export function findConflictDiagnostics(rules: ResolvedRule[]): ValidationDiagnostic[] {
  return rules.flatMap((rule) => {
    const { conflict } = rule;
    if (!conflict) return [];
    return [
      {
        level: "error" as const,
        file: conflict.attemptedFile,
        field: "enforcement",
        message:
          `CONFLICT: ${conflict.attemptedFile} sets enforcement: ${conflict.attemptedEnforcement} ` +
          `but ${conflict.lockedBy} locks "${rule.frontmatter.id}" as hard. ` +
          `Team cannot relax this rule. Remove the override or contact ${conflict.lockedOwner}.`,
      },
    ];
  });
}

export interface SiblingHardConflict {
  id: string;
  sources: [string, string];
}

function contentSignature(file: InheritanceLayer["files"][number]): string {
  const { enforcement, applies_to, category, owner } = file.frontmatter;
  return JSON.stringify({ enforcement, applies_to, category, owner, body: file.body });
}

/** Two parents on the same level defining the same hard rule differently must be resolved by humans. */
export function detectSiblingHardConflicts(
  layers: InheritanceLayer[],
  localIds: ReadonlySet<string>
): SiblingHardConflict[] {
  const firstSeen = new Map<string, { source: string; signature: string }>();
  const conflicts = new Map<string, SiblingHardConflict>();

  for (const layer of layers) {
    for (const file of layer.files) {
      const { id, enforcement } = file.frontmatter;
      if (enforcement !== "hard" || localIds.has(id) || conflicts.has(id)) continue;

      const source = file.provenance ?? layer.provenance;
      const signature = contentSignature(file);
      const previous = firstSeen.get(id);
      if (!previous) {
        firstSeen.set(id, { source, signature });
      } else if (previous.signature !== signature) {
        conflicts.set(id, { id, sources: [previous.source, source] });
      }
    }
  }
  return Array.from(conflicts.values());
}

export function findSiblingConflictDiagnostics(conflicts: SiblingHardConflict[]): ValidationDiagnostic[] {
  return conflicts.map(({ id, sources }) => ({
    level: "error" as const,
    file: "config.yaml",
    field: "inherits_from",
    message:
      `CONFLICT: ${sources[0]} and ${sources[1]} both define hard rule "${id}" differently. ` +
      `Define "${id}" locally to resolve it explicitly, or align the two sources.`,
  }));
}
