import { execFileSync } from "node:child_process";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCheck } from "../src/lib/verify/checks.js";
import { runChecks, shouldFail } from "../src/lib/verify/run.js";
import { validateFiles } from "../src/lib/schema.js";
import { listChangedFiles } from "../src/lib/verify/changed.js";
import { parseRegexTimeout } from "../src/lib/verify/options.js";
import type { VerifySpec } from "../src/lib/verify/types.js";
import type { ResolvedRule } from "../src/lib/types.js";

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "wow-verify-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const ctx = (overrides = {}) => ({ root, provenance: "local", allowCommands: false, ...overrides });

describe("runCheck: file-exists / file-absent", () => {
  it("passes when the file exists", async () => {
    await writeFile(join(root, "SECURITY.md"), "x");
    const spec: VerifySpec = { type: "deterministic", check: "file-exists", path: "SECURITY.md" };
    expect((await runCheck(spec, ctx())).verdict).toBe("pass");
  });

  it("fails with evidence when the file is missing", async () => {
    const spec: VerifySpec = { type: "deterministic", check: "file-exists", path: "SECURITY.md" };
    const result = await runCheck(spec, ctx());
    expect(result.verdict).toBe("fail");
    expect(result.evidence).toContain("SECURITY.md");
  });

  it("file-absent fails when the file exists", async () => {
    await writeFile(join(root, ".env"), "x");
    const spec: VerifySpec = { type: "deterministic", check: "file-absent", path: ".env" };
    expect((await runCheck(spec, ctx())).verdict).toBe("fail");
  });

  it("rejects paths that escape the repository root", async () => {
    const spec: VerifySpec = { type: "deterministic", check: "file-exists", path: "../etc/passwd" };
    const result = await runCheck(spec, ctx());
    expect(result.verdict).toBe("fail");
    expect(result.evidence).toMatch(/outside/i);
  });

  it("rejects absolute paths", async () => {
    const spec: VerifySpec = { type: "deterministic", check: "file-exists", path: "/etc/passwd" };
    expect((await runCheck(spec, ctx())).evidence).toMatch(/outside/i);
  });
});

describe("runCheck: pattern", () => {
  beforeEach(async () => {
    await mkdir(join(root, "src"));
    await writeFile(join(root, "src", "a.ts"), "const key = 'AKIA1234';\n");
    await writeFile(join(root, "src", "b.ts"), "const ok = 1;\n");
  });

  it("forbid fails and lists offending files", async () => {
    const spec: VerifySpec = { type: "deterministic", check: "pattern", glob: "src/**/*.ts", regex: "AKIA\\w+", mode: "forbid" };
    const result = await runCheck(spec, ctx());
    expect(result.verdict).toBe("fail");
    expect(result.evidence).toContain("src/a.ts");
    expect(result.evidence).not.toContain("src/b.ts");
  });

  it("forbid passes when nothing matches", async () => {
    const spec: VerifySpec = { type: "deterministic", check: "pattern", glob: "src/b.ts", contains: "AKIA", mode: "forbid" };
    expect((await runCheck(spec, ctx())).verdict).toBe("pass");
  });

  it("require fails when a matched file lacks the pattern", async () => {
    const spec: VerifySpec = { type: "deterministic", check: "pattern", glob: "src/**/*.ts", contains: "const key", mode: "require" };
    const result = await runCheck(spec, ctx());
    expect(result.verdict).toBe("fail");
    expect(result.evidence).toContain("src/b.ts");
  });

  it("fails when the glob matches no files in require mode", async () => {
    const spec: VerifySpec = { type: "deterministic", check: "pattern", glob: "nope/**", contains: "x", mode: "require" };
    expect((await runCheck(spec, ctx())).verdict).toBe("fail");
  });

  it("fails on an invalid regular expression instead of throwing", async () => {
    const spec: VerifySpec = { type: "deterministic", check: "pattern", glob: "src/**", regex: "(", mode: "forbid" };
    const result = await runCheck(spec, ctx());
    expect(result.verdict).toBe("fail");
    expect(result.evidence).toMatch(/invalid/i);
  });

  it("ignores node_modules and .git", async () => {
    await mkdir(join(root, "node_modules"));
    await writeFile(join(root, "node_modules", "x.ts"), "AKIA9999");
    const spec: VerifySpec = { type: "deterministic", check: "pattern", glob: "**/*.ts", contains: "AKIA9999", mode: "forbid" };
    expect((await runCheck(spec, ctx())).verdict).toBe("pass");
  });
});

describe("runCheck: command", () => {
  const spec = (argv: string[]): VerifySpec => ({ type: "deterministic", check: "command", argv });

  it("is skipped unless commands are allowed", async () => {
    const result = await runCheck(spec(["node", "-e", "process.exit(0)"]), ctx());
    expect(result.verdict).toBe("skipped");
    expect(result.evidence).toContain("--allow-commands");
  });

  it("is never run for inherited rules, even when allowed", async () => {
    const result = await runCheck(spec(["node", "-e", "process.exit(0)"]), ctx({ provenance: "company", allowCommands: true }));
    expect(result.verdict).toBe("skipped");
    expect(result.evidence).toMatch(/inherited/i);
  });

  it("passes on the expected exit code", async () => {
    const result = await runCheck(spec(["node", "-e", "process.exit(0)"]), ctx({ allowCommands: true }));
    expect(result.verdict).toBe("pass");
  });

  it("fails on a different exit code and captures output", async () => {
    const result = await runCheck(spec(["node", "-e", "console.error('boom');process.exit(3)"]), ctx({ allowCommands: true }));
    expect(result.verdict).toBe("fail");
    expect(result.evidence).toContain("exit 3");
    expect(result.evidence).toContain("boom");
  });

  it("does not interpret shell metacharacters", async () => {
    const result = await runCheck(spec(["echo", "a; touch pwned"]), ctx({ allowCommands: true }));
    expect(result.verdict).toBe("pass");
    const { access } = await import("node:fs/promises");
    await expect(access(join(root, "pwned"))).rejects.toThrow();
  });

  it("fails when the executable does not exist", async () => {
    const result = await runCheck(spec(["definitely-not-a-binary-xyz"]), ctx({ allowCommands: true }));
    expect(result.verdict).toBe("fail");
  });
});

describe("runCheck: human and llm", () => {
  it("human yields needs-human with instructions", async () => {
    const result = await runCheck({ type: "human", instructions: "Security team signs off" }, ctx());
    expect(result.verdict).toBe("needs-human");
    expect(result.evidence).toContain("Security team signs off");
  });

  it("llm is advisory and not evaluated by the CLI", async () => {
    const result = await runCheck({ type: "llm", prompt: "Is the PR description clear?" }, ctx());
    expect(result.verdict).toBe("skipped");
    expect(result.evidence).toMatch(/agent/i);
  });
});

const makeRule = (
  id: string,
  enforcement: "hard" | "soft" | "info",
  verify: VerifySpec | undefined,
  provenance = "local",
  appliesTo = ["pr"]
): ResolvedRule => ({
  frontmatter: {
    id,
    title: id,
    category: "quality",
    enforcement,
    owner: "@o",
    applies_to: appliesTo,
    last_reviewed: "2026-01-01",
    verify,
  },
  body: "",
  filePath: `${id}.md`,
  provenance,
});

describe("runChecks / shouldFail", () => {
  const exists = (path: string): VerifySpec => ({ type: "deterministic", check: "file-exists", path });

  it("builds a report with per-rule results and a summary", async () => {
    await writeFile(join(root, "A.md"), "x");
    const report = await runChecks(
      [makeRule("a", "hard", exists("A.md")), makeRule("b", "soft", exists("B.md")), makeRule("c", "info", undefined)],
      ctx()
    );
    expect(report.results.map((r) => [r.ruleId, r.verdict])).toEqual([["a", "pass"], ["b", "fail"]]);
    expect(report.summary).toMatchObject({ pass: 1, fail: 1, unverified: 1 });
  });

  it("filters by trigger", async () => {
    const report = await runChecks(
      [makeRule("a", "soft", exists("A.md"), "local", ["commit"]), makeRule("b", "soft", exists("B.md"))],
      ctx(),
      { trigger: "pr" }
    );
    expect(report.results.map((r) => r.ruleId)).toEqual(["b"]);
  });

  it("fails the run only when a hard rule fails", async () => {
    const hardFail = await runChecks([makeRule("a", "hard", exists("none"))], ctx());
    const softFail = await runChecks([makeRule("b", "soft", exists("none"))], ctx());
    expect(shouldFail(hardFail, false)).toBe(true);
    expect(shouldFail(softFail, false)).toBe(false);
    expect(shouldFail(softFail, true)).toBe(true);
  });

  it("treats a hard rule needing a human as a failure only in strict mode", async () => {
    const report = await runChecks([makeRule("h", "hard", { type: "human", instructions: "sign off" })], ctx());
    expect(shouldFail(report, false)).toBe(false);
    expect(shouldFail(report, true)).toBe(true);
  });

  it("includes provenance and verifier type in each result", async () => {
    const report = await runChecks([makeRule("a", "hard", exists("none"), "company")], ctx());
    expect(report.results[0]).toMatchObject({ provenance: "company", verifier: "deterministic:file-exists", enforcement: "hard" });
  });
});

describe("schema: verify block", () => {
  const file = (frontmatter: Record<string, unknown>) => ({
    frontmatter: {
      id: "r",
      title: "R",
      category: "quality",
      enforcement: "soft",
      owner: "@o",
      applies_to: ["pr"],
      ...frontmatter,
    } as never,
    body: "",
    filePath: "r.md",
  });

  it("accepts each verifier shape", async () => {
    const specs = [
      { type: "deterministic", check: "file-exists", path: "A" },
      { type: "deterministic", check: "pattern", glob: "**/*.ts", regex: "x", mode: "forbid" },
      { type: "deterministic", check: "command", argv: ["npm", "test"] },
      { type: "human", instructions: "sign off" },
      { type: "llm", prompt: "judge" },
    ];
    for (const verify of specs) {
      const result = await validateFiles([file({ verify })]);
      expect(result.valid, JSON.stringify(verify)).toBe(true);
    }
  });

  it("rejects a hard rule whose only verifier is an llm", async () => {
    const result = await validateFiles([file({ enforcement: "hard", verify: { type: "llm", prompt: "judge" } })]);
    expect(result.valid).toBe(false);
  });

  it("allows an llm verifier on soft rules", async () => {
    const result = await validateFiles([file({ enforcement: "soft", verify: { type: "llm", prompt: "judge" } })]);
    expect(result.valid).toBe(true);
  });

  it("rejects unknown checks and missing fields", async () => {
    expect((await validateFiles([file({ verify: { type: "deterministic", check: "magic" } })])).valid).toBe(false);
    expect((await validateFiles([file({ verify: { type: "deterministic", check: "file-exists" } })])).valid).toBe(false);
    expect((await validateFiles([file({ verify: { type: "deterministic", check: "pattern", glob: "*" } })])).valid).toBe(false);
  });
});

describe("runCheck: catastrophic regex", () => {
  it("fails instead of hanging on catastrophic backtracking", async () => {
    await writeFile(join(root, "a.txt"), "a".repeat(40) + "!");
    const spec: VerifySpec = { type: "deterministic", check: "pattern", glob: "*.txt", regex: "^(a+)+$", mode: "forbid" };
    const result = await runCheck(spec, ctx({ regexTimeoutMs: 100 }));
    expect(result.verdict).toBe("fail");
    expect(result.evidence).toContain("timed out");
  }, 15000);
});

describe("runChecks: ordering", () => {
  it("keeps results in rule order when checks run in parallel", async () => {
    const rules = ["a", "b", "c", "d"].map((id) => makeRule(id, "soft", { type: "deterministic", check: "file-exists", path: "none" }));
    const report = await runChecks(rules, ctx());
    expect(report.results.map((result) => result.ruleId)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("parseRegexTimeout", () => {
  it("accepts positive integers only", () => {
    expect(parseRegexTimeout("250")).toBe(250);
    for (const bad of ["0", "-1", "1.5", "x", ""]) expect(parseRegexTimeout(bad)).toBeUndefined();
  });
});

describe("runCheck: multiple timeouts", () => {
  it("reports every timed-out file up to the cap", async () => {
    for (const name of ["a", "b"]) await writeFile(join(root, `${name}.txt`), "a".repeat(40) + "!");
    const spec: VerifySpec = { type: "deterministic", check: "pattern", glob: "*.txt", regex: "^(a+)+$", mode: "forbid" };
    const result = await runCheck(spec, ctx({ regexTimeoutMs: 50 }));
    expect(result.evidence).toContain("a.txt, b.txt");
  });
});

describe("changed-file scoping", () => {
  const spec: VerifySpec = { type: "deterministic", check: "pattern", glob: "*.txt", contains: "SECRET", mode: "forbid" };

  it("ignores offending files that did not change", async () => {
    await writeFile(join(root, "old.txt"), "SECRET");
    await writeFile(join(root, "new.txt"), "fine");
    expect((await runCheck(spec, ctx({ changedFiles: ["new.txt"] }))).verdict).toBe("pass");
    expect((await runCheck(spec, ctx({ changedFiles: ["old.txt"] }))).verdict).toBe("fail");
  });

  it("passes when nothing relevant changed, even in require mode", async () => {
    const require: VerifySpec = { ...spec, mode: "require" } as VerifySpec;
    expect((await runCheck(require, ctx({ changedFiles: [] }))).verdict).toBe("pass");
  });
});

describe("listChangedFiles", () => {
  it("includes untracked files and modifications since the ref", async () => {
    const run = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
    run("init", "-q");
    run("-c", "user.email=a@b.c", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "init");
    await writeFile(join(root, "fresh.txt"), "x");
    expect(await listChangedFiles(root, "HEAD")).toEqual(["fresh.txt"]);
  });

  it("rejects refs that look like options", async () => {
    await expect(listChangedFiles(root, "--output=x")).rejects.toThrow("Invalid git ref");
  });
});
