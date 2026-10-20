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
