import { access } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type { CheckResult } from "./types.js";

export const pass = (evidence: string): CheckResult => ({ verdict: "pass", evidence });
export const fail = (evidence: string): CheckResult => ({ verdict: "fail", evidence });

export function insideRoot(root: string, path: string): string | undefined {
  if (isAbsolute(path)) return undefined;
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  return rel.startsWith("..") || isAbsolute(rel) ? undefined : absolute;
}

export async function exists(path: string): Promise<boolean> {
  return access(path).then(() => true, () => false);
}
