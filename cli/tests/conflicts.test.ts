import { describe, it, expect } from "vitest";
import { findConflictDiagnostics } from "../src/lib/conflicts.js";
import type { ResolvedRule } from "../src/lib/types.js";

const makeRule = (conflict?: ResolvedRule["conflict"]): ResolvedRule => ({
  frontmatter: {
    id: "security-review",
    title: "Security",
    category: "quality",
    enforcement: "hard",
    owner: "@security-team",
    applies_to: ["pr"],
    last_reviewed: "2026-01-01",
  },
  body: "",
  filePath: "company/security-review.md",
  provenance: "company",
  conflict,
});

describe("findConflictDiagnostics", () => {
  it("returns nothing when no rule has a conflict", () => {
    expect(findConflictDiagnostics([makeRule()])).toEqual([]);
  });

  it("emits an error that names the file, the lock and the owner", () => {
    const [diag] = findConflictDiagnostics([
      makeRule({
        lockedBy: "company",
        lockedOwner: "@security-team",
        attemptedBy: "local",
        attemptedFile: "wow/security-review.md",
        attemptedEnforcement: "soft",
      }),
    ]);
    expect(diag.level).toBe("error");
    expect(diag.file).toBe("wow/security-review.md");
    expect(diag.field).toBe("enforcement");
    expect(diag.message).toContain("CONFLICT");
    expect(diag.message).toContain("company");
    expect(diag.message).toContain("@security-team");
    expect(diag.message).toContain("Remove the override");
  });
});
