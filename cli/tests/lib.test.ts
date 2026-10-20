import { describe, it, expect } from "vitest";
import { parseWoWContent } from "../src/lib/parser.js";
import { parseConfig } from "../src/lib/config.js";
import { resolveInheritance } from "../src/lib/resolver.js";

describe("parser", () => {
  it("parses frontmatter and body from wow file content", () => {
    const content = `---
id: code-review
title: Code Review Standards
category: quality
enforcement: soft
owner: team-lead
applies_to:
  - pr
last_reviewed: "2026-05-20"
tags:
  - review
---

# Code Review Standards

Every PR requires approval.
`;

    const result = parseWoWContent(content, "wow/code-review.md");

    expect(result.frontmatter.id).toBe("code-review");
    expect(result.frontmatter.category).toBe("quality");
    expect(result.frontmatter.enforcement).toBe("soft");
    expect(result.frontmatter.applies_to).toEqual(["pr"]);
    expect(result.body).toContain("Every PR requires approval.");
    expect(result.filePath).toBe("wow/code-review.md");
  });
});

describe("config", () => {
  it("parses valid config.yaml content", () => {
    const raw = `
wow_version: "1.0"
files:
  - path: code-review.md
    id: code-review
  - path: dod.md
    id: definition-of-done
`;

    const config = parseConfig(raw);

    expect(config.wow_version).toBe("1.0");
    expect(config.files).toHaveLength(2);
    expect(config.files[0].id).toBe("code-review");
  });

  it("throws on missing wow_version", () => {
    expect(() => parseConfig("files: []")).toThrow("wow_version");
  });

  it("throws on missing files array", () => {
    expect(() => parseConfig('wow_version: "1.0"')).toThrow("files array");
  });
});

describe("resolver", () => {
  const makeFile = (id: string, enforcement: "hard" | "soft" | "info") => ({
    frontmatter: {
      id,
      title: id,
      category: "quality" as const,
      enforcement,
      owner: "owner",
      applies_to: ["pr"],
      last_reviewed: "2026-01-01",
    },
    body: "",
    filePath: `${id}.md`,
  });

  it("child overrides parent soft rule", () => {
    const parent = [makeFile("rule-1", "soft")];
    const child = [makeFile("rule-1", "hard")];

    const resolved = resolveInheritance(parent, child, "company", "team");

    expect(resolved).toHaveLength(1);
    expect(resolved[0].frontmatter.enforcement).toBe("hard");
    expect(resolved[0].provenance).toBe("team");
  });

  it("child cannot relax parent hard rule", () => {
    const parent = [makeFile("rule-1", "hard")];
    const child = [makeFile("rule-1", "soft")];

    const resolved = resolveInheritance(parent, child, "company", "team");

    expect(resolved).toHaveLength(1);
    expect(resolved[0].frontmatter.enforcement).toBe("hard");
    expect(resolved[0].provenance).toBe("company");
    expect(resolved[0].overriddenBy).toContain("blocked");
  });

  it("merges distinct rules from parent and child", () => {
    const parent = [makeFile("rule-1", "soft")];
    const child = [makeFile("rule-2", "hard")];

    const resolved = resolveInheritance(parent, child, "company", "team");

    expect(resolved).toHaveLength(2);
    const ids = resolved.map((r) => r.frontmatter.id);
    expect(ids).toContain("rule-1");
    expect(ids).toContain("rule-2");
  });
});
