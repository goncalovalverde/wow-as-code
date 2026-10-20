import { createContext, Script } from "node:vm";
import { readFile, stat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import fg from "fast-glob";
import type { CheckContext, CheckResult, VerifySpec } from "./types.js";
import { fail, pass } from "./common.js";

import { LIMITS } from "./limits.js";

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
  if (!info.isFile() || info.size > LIMITS.maxFileBytes) return undefined;
  return readFile(path, "utf-8");
}

async function listFiles(spec: PatternSpec, context: CheckContext): Promise<string[]> {
  const files = await fg(spec.glob, { cwd: context.root, ignore: [...LIMITS.ignoredDirs], dot: true, onlyFiles: true, followSymbolicLinks: false });
  const changed = context.changedFiles && new Set(context.changedFiles);
  return files.filter((file) => !changed || changed.has(file)).sort().slice(0, LIMITS.maxFiles);
}

function summarize(spec: PatternSpec, checked: number, offenders: string[]): CheckResult {
  if (offenders.length === 0) return pass(`${checked} file(s) checked against "${spec.glob}"`);
  const listed = offenders.slice(0, LIMITS.maxEvidenceFiles).join(", ");
  const extra = offenders.length > LIMITS.maxEvidenceFiles ? ` (+${offenders.length - LIMITS.maxEvidenceFiles} more)` : "";
  const reason = spec.mode === "forbid" ? "contain a forbidden pattern" : "lack a required pattern";
  return fail(`${offenders.length} file(s) ${reason}: ${listed}${extra}`);
}

export async function checkPattern(spec: PatternSpec, context: CheckContext): Promise<CheckResult> {
  if (isAbsolute(spec.glob) || spec.glob.split("/").includes("..")) {
    return fail(`Glob "${spec.glob}" is outside the repository root`);
  }

  let matches: (content: string) => boolean;
  try {
    matches = buildMatcher(spec, context.regexTimeoutMs ?? LIMITS.defaultRegexTimeoutMs);
  } catch (error) {
    return fail(`Invalid regular expression: ${error instanceof Error ? error.message : String(error)}`);
  }

  const files = await listFiles(spec, context);
  if (files.length === 0) {
    const scope = context.changedFiles ? "changed files match" : "files match";
    return spec.mode === "require" && !context.changedFiles ? fail(`No ${scope} "${spec.glob}"`) : pass(`No ${scope} "${spec.glob}"`);
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
      if (timedOut.length >= LIMITS.maxRegexTimeouts) break;
    }
  }

  if (timedOut.length > 0) {
    const stopped = timedOut.length >= LIMITS.maxRegexTimeouts ? "; scan stopped early" : "";
    return fail(`Regular expression timed out on ${timedOut.join(", ")} (possible catastrophic backtracking)${stopped}`);
  }
  return summarize(spec, files.length, offenders);
}
