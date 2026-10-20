import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseGitSource, validateRef, GitSourceProvider, isRemoteSource } from "../src/lib/git-source.js";
import { createSourceProvider } from "../src/lib/sources.js";
import { resolveRules } from "../src/lib/load.js";

describe("parseGitSource", () => {
  it("splits a GitHub https URL into repo and subpath", () => {
    expect(parseGitSource("https://github.com/org/company-wow/wow")).toEqual({
      repoUrl: "https://github.com/org/company-wow",
      subPath: "wow",
      host: "github.com",
    });
  });

  it("uses an explicit .git segment as the repo boundary", () => {
    expect(parseGitSource("https://git.example.com/a/b/c.git/team/wow", { allowFile: false })).toMatchObject({
      repoUrl: "https://git.example.com/a/b/c.git",
      subPath: "team/wow",
    });
  });

  it("supports a repo root with no subpath", () => {
    expect(parseGitSource("https://github.com/org/repo").subPath).toBe("");
  });

  it("rejects insecure and unknown schemes", () => {
    expect(() => parseGitSource("http://github.com/org/repo")).toThrow(/scheme/i);
    expect(() => parseGitSource("ftp://github.com/org/repo")).toThrow(/scheme/i);
    expect(() => parseGitSource("file:///tmp/x.git/wow")).toThrow(/scheme/i);
  });

  it("allows file:// only when explicitly enabled", () => {
    expect(parseGitSource("file:///tmp/x.git/wow", { allowFile: true }).subPath).toBe("wow");
  });

  it("rejects path traversal in the subpath", () => {
    expect(() => parseGitSource("https://github.com/org/repo/../etc")).toThrow(/traversal/i);
  });

  it("rejects URLs that look like git options", () => {
    expect(() => parseGitSource("--upload-pack=evil")).toThrow();
  });
});

describe("validateRef", () => {
  it("accepts tags and branches", () => {
    expect(() => validateRef("v1.0")).not.toThrow();
    expect(() => validateRef("feature/x-1")).not.toThrow();
  });

  it("rejects option-like and malformed refs", () => {
    expect(() => validateRef("--upload-pack=evil")).toThrow();
    expect(() => validateRef("a b")).toThrow();
    expect(() => validateRef("a;rm")).toThrow();
    expect(() => validateRef("")).toThrow();
  });
});

describe("isRemoteSource", () => {
  it("detects URL-style sources", () => {
    expect(isRemoteSource("https://github.com/o/r/wow")).toBe(true);
    expect(isRemoteSource("ssh://git@github.com/o/r/wow")).toBe(true);
    expect(isRemoteSource("../company/wow")).toBe(false);
    expect(isRemoteSource("/abs/wow")).toBe(false);
  });
});

const ruleDoc = (id: string, enforcement: string) =>
  `---\nid: ${id}\ntitle: ${id}\ncategory: quality\nenforcement: ${enforcement}\nowner: "@sec"\napplies_to: [pr]\nlast_reviewed: 2026-01-01\n---\n\nbody ${id}\n`;

describe("GitSourceProvider (local bare repo)", () => {
  let root: string;
  let repoUrl: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "wow-git-"));
    const work = join(root, "work");
    await mkdir(join(work, "wow"), { recursive: true });
    await writeFile(
      join(work, "wow", "config.yaml"),
      'wow_version: "1.0"\nfiles:\n  - path: sec.md\n    id: sec\n'
    );
    await writeFile(join(work, "wow", "sec.md"), ruleDoc("sec", "hard"));
    const git = (...args: string[]) =>
      execFileSync("git", args, {
        cwd: work,
        stdio: "pipe",
        env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" },
      });
    git("init", "-q", "-b", "main");
    git("add", ".");
    git("commit", "-q", "-m", "init");
    git("tag", "v1.0");
    execFileSync("git", ["clone", "-q", "--bare", work, join(root, "company.git")]);
    repoUrl = `file://${join(root, "company.git")}`;
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("clones the ref and loads the wow/ directory", async () => {
    const provider = new GitSourceProvider({ allowFile: true });
    try {
      const loaded = await provider.load(`${repoUrl}/wow`, { ref: "v1.0" });
      expect(loaded.files.map((f) => f.frontmatter.id)).toEqual(["sec"]);
      expect(loaded.id).toContain("company.git/wow@v1.0");
    } finally {
      await provider.dispose();
    }
  });

  it("fails clearly for an unknown ref", async () => {
    const provider = new GitSourceProvider({ allowFile: true });
    try {
      await expect(provider.load(`${repoUrl}/wow`, { ref: "v9.9" })).rejects.toThrow(/clone/i);
    } finally {
      await provider.dispose();
    }
  });

  it("requires a ref for remote sources", async () => {
    const provider = new GitSourceProvider({ allowFile: true });
    await expect(provider.load(`${repoUrl}/wow`)).rejects.toThrow(/ref/i);
    await provider.dispose();
  });

  it("resolves a team that inherits a remote hard rule", async () => {
    const team = join(root, "team");
    await mkdir(team, { recursive: true });
    await writeFile(
      join(team, "config.yaml"),
      `wow_version: "1.0"\ninherits_from:\n  - url: "${repoUrl}/wow"\n    ref: "v1.0"\nfiles:\n  - path: sec.md\n    id: sec\n`
    );
    await writeFile(join(team, "sec.md"), ruleDoc("sec", "soft"));

    const provider = createSourceProvider({ allowFile: true });
    try {
      const { rules, warnings } = await resolveRules(team, provider);
      expect(warnings).toEqual([]);
      expect(rules).toHaveLength(1);
      expect(rules[0].frontmatter.enforcement).toBe("hard");
      expect(rules[0].conflict).toMatchObject({ attemptedEnforcement: "soft", lockedOwner: "@sec" });
    } finally {
      await provider.dispose?.();
    }
  });
});
