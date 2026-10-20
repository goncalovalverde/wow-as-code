import { describe, it, expect } from "vitest";
import {
  detectSiblingHardConflicts,
  findConflictDiagnostics,
  findSiblingConflictDiagnostics,
} from "../src/lib/conflicts.js";
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

const makeHard = (id: string, body: string, enforcement: "hard" | "soft" = "hard") => ({
  frontmatter: {
    id,
    title: id,
    category: "quality" as const,
    enforcement,
    owner: "@o",
    applies_to: ["pr"],
    last_reviewed: "2026-01-01",
  },
  body,
  filePath: `${id}.md`,
});

describe("detectSiblingHardConflicts", () => {
  const layers = (a: string, b: string) => [
    { provenance: "unit-a", files: [makeHard("sec", a)] },
    { provenance: "unit-b", files: [makeHard("sec", b)] },
  ];

  it("flags two parents defining the same hard rule differently", () => {
    const found = detectSiblingHardConflicts(layers("one", "two"), new Set());
    expect(found).toEqual([{ id: "sec", sources: ["unit-a", "unit-b"] }]);
  });

  it("ignores identical hard rules from two parents", () => {
    expect(detectSiblingHardConflicts(layers("same", "same"), new Set())).toEqual([]);
  });

  it("is resolved by defining the rule locally", () => {
    expect(detectSiblingHardConflicts(layers("one", "two"), new Set(["sec"]))).toEqual([]);
  });

  it("ignores soft rules", () => {
    const soft = [
      { provenance: "a", files: [makeHard("x", "one", "soft")] },
      { provenance: "b", files: [makeHard("x", "two", "soft")] },
    ];
    expect(detectSiblingHardConflicts(soft, new Set())).toEqual([]);
  });

  it("renders an error diagnostic naming both sources", () => {
    const [diag] = findSiblingConflictDiagnostics([{ id: "sec", sources: ["unit-a", "unit-b"] }]);
    expect(diag.level).toBe("error");
    expect(diag.message).toContain("unit-a");
    expect(diag.message).toContain("unit-b");
    expect(diag.message).toContain("Define");
  });
});
