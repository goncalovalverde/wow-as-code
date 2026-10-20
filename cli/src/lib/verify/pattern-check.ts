import { createContext, Script } from "node:vm";
import { readFile, stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import fg from "fast-glob";
import type { CheckContext, CheckResult, VerifySpec } from "./types.js";
import { fail, pass } from "./common.js";

const MAX_FILES = 5000;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_EVIDENCE_FILES = 10;
const MAX_TIMEOUTS = 3;
const DEFAULT_REGEX_TIMEOUT_MS = 1000;
const IGNORED_DIRS = ["**/node_modules/**", "**/.git/**"];

type PatternSpec = Extract<VerifySpec, { check: "pattern" }>;

function buildMatcher(spec: PatternSpec, timeoutMs: number): (content: string) => boolean {
  if (spec.contains !== undefined) {
    const needle = spec.contains;
    return (content) => content.includes(needle);
  }
  const expression = new RegExp(spec.regex ?? "");
  const sandbox = createContext({ expression, content: "" });
  const script = new Script("expression.test(content)");
  return (content) => {
    sandbox.content = content;
    // vm timeout aborts catastrophic backtracking (ReDoS) from untrusted patterns
    return script.runInContext(sandbox, { timeout: timeoutMs }) as boolean;
  };
}

async function readCapped(path: string): Promise<string | undefined> {
  const info = await stat(path);
  if (!info.isFile() || info.size > MAX_FILE_BYTES) return undefined;
  return readFile(path, "utf-8");
}

async function listFiles(spec: PatternSpec, root: string): Promise<string[]> {
  const files = await fg(spec.glob, { cwd: root, ignore: IGNORED_DIRS, dot: true, onlyFiles: true, followSymbolicLinks: false });
  return files.sort().slice(0, MAX_FILES);
}

function summarize(spec: PatternSpec, checked: number, offenders: string[]): CheckResult {
  if (offenders.length === 0) return pass(`${checked} file(s) checked against "${spec.glob}"`);
  const listed = offenders.slice(0, MAX_EVIDENCE_FILES).join(", ");
  const extra = offenders.length > MAX_EVIDENCE_FILES ? ` (+${offenders.length - MAX_EVIDENCE_FILES} more)` : "";
  const reason = spec.mode === "forbid" ? "contain a forbidden pattern" : "lack a required pattern";
  return fail(`${offenders.length} file(s) ${reason}: ${listed}${extra}`);
}

export async function checkPattern(spec: PatternSpec, context: CheckContext): Promise<CheckResult> {
  if (isAbsolute(spec.glob) || spec.glob.split("/").includes("..")) {
    return fail(`Glob "${spec.glob}" is outside the repository root`);
  }

  let matches: (content: string) => boolean;
  try {
    matches = buildMatcher(spec, context.regexTimeoutMs ?? DEFAULT_REGEX_TIMEOUT_MS);
  } catch (error) {
    return fail(`Invalid regular expression: ${error instanceof Error ? error.message : String(error)}`);
  }

  const files = await listFiles(spec, context.root);
  if (files.length === 0) {
    return spec.mode === "require" ? fail(`No files match "${spec.glob}"`) : pass(`No files match "${spec.glob}"`);
  }

  const offenders: string[] = [];
  const timedOut: string[] = [];
  for (const file of files) {
    const content = await readCapped(resolve(context.root, file));
    if (content === undefined) continue;
    try {
      const found = matches(content);
      if ((spec.mode === "forbid" && found) || (spec.mode === "require" && !found)) offenders.push(file);
    } catch {
      timedOut.push(file);
      if (timedOut.length >= MAX_TIMEOUTS) break;
    }
  }

  if (timedOut.length > 0) {
    const stopped = timedOut.length >= MAX_TIMEOUTS ? "; scan stopped early" : "";
    return fail(`Regular expression timed out on ${timedOut.join(", ")} (possible catastrophic backtracking)${stopped}`);
  }
  return summarize(spec, files.length, offenders);
}
