import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveChain, FilesystemSourceProvider } from "../src/lib/resolver.js";
import { resolveRules } from "../src/lib/load.js";
import { findReviewDiagnostics } from "../src/lib/staleness.js";
import { parseWoWContent } from "../src/lib/parser.js";
import { parseManifestEntries } from "../src/lib/manifest.js";
import type { WoWFile } from "../src/lib/types.js";

const makeFile = (id: string, enforcement: "hard" | "soft" | "info", extra = {}): WoWFile => ({
  frontmatter: {
    id,
    title: id,
    category: "quality",
    enforcement,
    owner: "owner",
    applies_to: ["pr"],
    last_reviewed: "2026-01-01",
    ...extra,
  },
  body: `body ${id}`,
  filePath: `${id}.md`,
});

const ruleDoc = (id: string, enforcement: string) =>
  `---\nid: ${id}\ntitle: ${id}\ncategory: quality\nenforcement: ${enforcement}\nowner: o\napplies_to: [pr]\nlast_reviewed: 2026-01-01\n---\n\nbody ${id}\n`;

async function writeWow(dir: string, rules: Record<string, string>, inherits?: string[]) {
  await mkdir(dir, { recursive: true });
  const entries = Object.keys(rules).map((id) => `  - path: ${id}.md\n    id: ${id}`);
  const inheritBlock = inherits
    ? `inherits_from:\n${inherits.map((url) => `  - url: "${url}"`).join("\n")}\n`
    : "";
  await writeFile(join(dir, "config.yaml"), `wow_version: "1.0"\n${inheritBlock}files:\n${entries.join("\n")}\n`);
  for (const [id, enforcement] of Object.entries(rules)) {
    await writeFile(join(dir, `${id}.md`), ruleDoc(id, enforcement));
  }
}

describe("resolveChain", () => {
  it("preserves per-rule provenance across three layers", () => {
    const resolved = resolveChain([
      { provenance: "company", files: [makeFile("a", "soft"), makeFile("b", "soft")] },
      { provenance: "unit", files: [makeFile("b", "hard")] },
      { provenance: "team", files: [makeFile("c", "soft")] },
    ]);
    const byId = Object.fromEntries(resolved.map((r) => [r.frontmatter.id, r.provenance]));
    expect(byId).toEqual({ a: "company", b: "unit", c: "team" });
  });

  it("keeps a company hard rule locked through later layers", () => {
    const resolved = resolveChain([
      { provenance: "company", files: [makeFile("a", "hard")] },
      { provenance: "unit", files: [makeFile("a", "soft")] },
      { provenance: "team", files: [makeFile("a", "info")] },
    ]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].frontmatter.enforcement).toBe("hard");
    expect(resolved[0].provenance).toBe("company");
    expect(resolved[0].overriddenBy).toContain("blocked");
  });

  it("returns an empty list for no layers", () => {
    expect(resolveChain([])).toEqual([]);
  });
});

describe("resolveRules (shared loader)", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "wow-load-"));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("loads local rules with local provenance", async () => {
    await writeWow(join(root, "team"), { a: "soft" });
    const { rules, warnings } = await resolveRules(join(root, "team"), new FilesystemSourceProvider());
    expect(rules.map((r) => r.provenance)).toEqual(["local"]);
    expect(warnings).toEqual([]);
  });

  it("merges a local parent source, with the hard lock enforced", async () => {
    await writeWow(join(root, "company"), { sec: "hard", base: "soft" });
    await writeWow(join(root, "team"), { sec: "soft", extra: "soft" }, ["../company"]);
    const { rules } = await resolveRules(join(root, "team"), new FilesystemSourceProvider());
    const byId = Object.fromEntries(rules.map((r) => [r.frontmatter.id, r]));
    expect(Object.keys(byId).sort()).toEqual(["base", "extra", "sec"]);
    expect(byId.sec.frontmatter.enforcement).toBe("hard");
    expect(byId.sec.provenance).toBe("../company");
    expect(byId.extra.provenance).toBe("local");
  });

  it("warns instead of failing when a remote source is unavailable", async () => {
    await writeWow(join(root, "team"), { a: "soft" }, ["https://github.com/org/wow"]);
    const { rules, warnings } = await resolveRules(join(root, "team"), new FilesystemSourceProvider());
    expect(rules).toHaveLength(1);
    expect(warnings[0]).toContain("https://github.com/org/wow");
  });

  it("reports a conflict when a local rule tries to relax an inherited hard rule", async () => {
    await writeWow(join(root, "company"), { sec: "hard" });
    await writeWow(join(root, "team"), { sec: "info" }, ["../company"]);
    const { rules } = await resolveRules(join(root, "team"), new FilesystemSourceProvider());
    expect(rules[0].conflict).toMatchObject({
      lockedBy: "../company",
      attemptedBy: "local",
      attemptedEnforcement: "info",
    });
  });

  it("reports conflicting hard rules from two sibling parents", async () => {
    await writeWow(join(root, "a"), { sec: "hard" });
    await writeWow(join(root, "b"), { sec: "hard" });
    await writeFile(join(root, "b", "sec.md"), ruleDoc("sec", "hard").replace("body sec", "different"));
    await writeWow(join(root, "team"), { own: "soft" }, ["../a", "../b"]);
    const { siblingConflicts } = await resolveRules(join(root, "team"), new FilesystemSourceProvider());
    expect(siblingConflicts).toEqual([{ id: "sec", sources: ["../a", "../b"] }]);
  });

  it("warns when a local source directory is missing", async () => {
    await writeWow(join(root, "team"), { a: "soft" }, ["../nope"]);
    const { warnings } = await resolveRules(join(root, "team"), new FilesystemSourceProvider());
    expect(warnings[0]).toContain("../nope");
  });
});

describe("findReviewDiagnostics", () => {
  const today = new Date("2026-06-01T00:00:00Z");

  it("warns when review_by is in the past", () => {
    const diags = findReviewDiagnostics([makeFile("a", "hard", { review_by: "2026-05-31" })], today);
    expect(diags).toHaveLength(1);
    expect(diags[0]).toMatchObject({ level: "warning", field: "review_by" });
  });

  it("is silent when review_by is today or later", () => {
    const files = [
      makeFile("a", "hard", { review_by: "2026-06-01" }),
      makeFile("b", "soft", { review_by: "2027-01-01" }),
    ];
    expect(findReviewDiagnostics(files, today)).toEqual([]);
  });

  it("is silent when review_by is absent", () => {
    expect(findReviewDiagnostics([makeFile("a", "soft")], today)).toEqual([]);
  });
});

describe("parser date normalization", () => {
  it("normalizes unquoted review_by dates to ISO strings", () => {
    const file = parseWoWContent(ruleDoc("a", "soft").replace("---\n\nbody", "review_by: 2026-12-01\n---\n\nbody"), "a.md");
    expect(file.frontmatter.review_by).toBe("2026-12-01");
  });
});

describe("parseManifestEntries", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "wow-manifest-"));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("returns a parsed file or an error per manifest entry without throwing", async () => {
    await writeWow(join(root, "w"), { a: "soft" });
    const config = {
      wow_version: "1.0",
      files: [
        { path: "a.md", id: "a" },
        { path: "missing.md", id: "m" },
      ],
    };
    const results = await parseManifestEntries(join(root, "w"), config);
    expect(results[0].file?.frontmatter.id).toBe("a");
    expect(results[0].error).toBeUndefined();
    expect(results[1].file).toBeUndefined();
    expect(results[1].error).toBeInstanceOf(Error);
  });
});
