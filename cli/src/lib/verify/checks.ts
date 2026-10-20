import { execFile } from "node:child_process";
import { access, readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { promisify } from "node:util";
import fg from "fast-glob";
import type { CheckContext, CheckResult, VerifySpec } from "./types.js";

const execFileAsync = promisify(execFile);

const MAX_FILES = 5000;
const MAX_FILE_BYTES = 256 * 1024;
const COMMAND_TIMEOUT_MS = 120_000;
const MAX_EVIDENCE_FILES = 10;
const IGNORED_DIRS = ["**/node_modules/**", "**/.git/**"];

const pass = (evidence: string): CheckResult => ({ verdict: "pass", evidence });
const fail = (evidence: string): CheckResult => ({ verdict: "fail", evidence });

function insideRoot(root: string, path: string): string | undefined {
  if (isAbsolute(path)) return undefined;
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  return rel.startsWith("..") || isAbsolute(rel) ? undefined : absolute;
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(() => true, () => false);
}

async function checkFile(spec: { check: string; path: string }, context: CheckContext): Promise<CheckResult> {
  const absolute = insideRoot(context.root, spec.path);
  if (!absolute) return fail(`Path "${spec.path}" is outside the repository root`);

  const present = await exists(absolute);
  if (spec.check === "file-exists") {
    return present ? pass(`${spec.path} exists`) : fail(`${spec.path} is missing`);
  }
  return present ? fail(`${spec.path} must not exist`) : pass(`${spec.path} is absent`);
}

function buildMatcher(spec: { contains?: string; regex?: string }): (content: string) => boolean {
  if (spec.contains !== undefined) {
    const needle = spec.contains;
    return (content) => content.includes(needle);
  }
  const expression = new RegExp(spec.regex ?? "");
  return (content) => expression.test(content);
}

async function readCapped(path: string): Promise<string | undefined> {
  const info = await stat(path);
  if (!info.isFile() || info.size > MAX_FILE_BYTES) return undefined;
  return readFile(path, "utf-8");
}

async function checkPattern(
  spec: Extract<VerifySpec, { check: "pattern" }>,
  context: CheckContext
): Promise<CheckResult> {
  if (isAbsolute(spec.glob) || spec.glob.split("/").includes("..")) {
    return fail(`Glob "${spec.glob}" is outside the repository root`);
  }

  let matches: (content: string) => boolean;
  try {
    matches = buildMatcher(spec);
  } catch (error) {
    return fail(`Invalid regular expression: ${error instanceof Error ? error.message : String(error)}`);
  }

  const files = (
    await fg(spec.glob, { cwd: context.root, ignore: IGNORED_DIRS, dot: true, onlyFiles: true, followSymbolicLinks: false })
  )
    .sort()
    .slice(0, MAX_FILES);

  if (files.length === 0) {
    return spec.mode === "require"
      ? fail(`No files match "${spec.glob}"`)
      : pass(`No files match "${spec.glob}"`);
  }

  const offenders: string[] = [];
  for (const file of files) {
    const content = await readCapped(resolve(context.root, file));
    if (content === undefined) continue;
    const found = matches(content);
    if ((spec.mode === "forbid" && found) || (spec.mode === "require" && !found)) offenders.push(file);
  }

  if (offenders.length === 0) return pass(`${files.length} file(s) checked against "${spec.glob}"`);
  const listed = offenders.slice(0, MAX_EVIDENCE_FILES).join(", ");
  const extra = offenders.length > MAX_EVIDENCE_FILES ? ` (+${offenders.length - MAX_EVIDENCE_FILES} more)` : "";
  const reason = spec.mode === "forbid" ? "contain a forbidden pattern" : "lack a required pattern";
  return fail(`${offenders.length} file(s) ${reason}: ${listed}${extra}`);
}

async function checkCommand(
  spec: Extract<VerifySpec, { check: "command" }>,
  context: CheckContext
): Promise<CheckResult> {
  if (context.provenance !== "local") {
    return { verdict: "skipped", evidence: `Commands are never run for inherited rules (from ${context.provenance})` };
  }
  if (!context.allowCommands) {
    return { verdict: "skipped", evidence: "Command checks require --allow-commands" };
  }

  const [executable, ...args] = spec.argv;
  const expected = spec.expect_exit ?? 0;
  try {
    await execFileAsync(executable, args, { cwd: context.root, timeout: COMMAND_TIMEOUT_MS });
    return expected === 0 ? pass(`${executable} exited 0`) : fail(`${executable} exited 0, expected ${expected}`);
  } catch (error) {
    const failure = error as { code?: unknown; stderr?: string; message: string };
    if (typeof failure.code === "number") {
      if (failure.code === expected) return pass(`${executable} exited ${expected}`);
      const output = failure.stderr?.trim().split("\n").slice(-3).join(" | ");
      return fail(`${executable} exit ${failure.code}, expected ${expected}${output ? `: ${output}` : ""}`);
    }
    return fail(`Could not run ${executable}: ${failure.message.split("\n")[0]}`);
  }
}

export async function runCheck(spec: VerifySpec, context: CheckContext): Promise<CheckResult> {
  switch (spec.type) {
    case "human":
      return { verdict: "needs-human", evidence: spec.instructions };
    case "llm":
      return { verdict: "skipped", evidence: "LLM verifiers are advisory; an agent must evaluate this rule" };
    case "deterministic":
      if (spec.check === "pattern") return checkPattern(spec, context);
      if (spec.check === "command") return checkCommand(spec, context);
      return checkFile(spec, context);
  }
}
