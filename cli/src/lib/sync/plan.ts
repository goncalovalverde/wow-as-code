import type { ResolvedRule } from "../types.js";
import { GENERATED_MARKER, TARGETS, renderTarget, type TargetId } from "./render.js";

export type SyncStatus = "created" | "updated" | "unchanged" | "blocked";

export interface SyncEntry {
  target: TargetId;
  path: string;
  status: SyncStatus;
  content: string;
}

export interface PlanOptions {
  force?: boolean;
}

export type ReadExisting = (path: string) => string | undefined;

function classify(existing: string | undefined, content: string, force: boolean): SyncStatus {
  if (existing === undefined) return "created";
  if (existing === content) return "unchanged";
  const isGenerated = existing.startsWith(GENERATED_MARKER);
  return isGenerated || force ? "updated" : "blocked";
}

export function planSync(
  rules: ResolvedRule[],
  targets: TargetId[],
  readExisting: ReadExisting,
  options: PlanOptions = {}
): SyncEntry[] {
  return targets.map((target) => {
    const { path } = TARGETS[target];
    const content = renderTarget(rules, target);
    const status = classify(readExisting(path), content, options.force ?? false);
    return { target, path, status, content };
  });
}
