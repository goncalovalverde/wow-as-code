import { join, resolve } from "node:path";
import { loadConfig } from "./config.js";
import { resolveChain, type InheritanceLayer, type SourceProvider } from "./resolver.js";
import type { ResolvedRule } from "./types.js";

export interface ResolveResult {
  rules: ResolvedRule[];
  warnings: string[];
}

const REMOTE_SOURCE = /^([a-z][a-z0-9+.-]*:\/\/|git@)/i;

async function resolveInto(
  wowDir: string,
  provider: SourceProvider,
  visited: Set<string>,
  warnings: string[]
): Promise<ResolvedRule[]> {
  const config = await loadConfig(join(wowDir, "config.yaml"));
  const layers: InheritanceLayer[] = [];

  for (const source of config.inherits_from ?? []) {
    if (REMOTE_SOURCE.test(source.url)) {
      warnings.push(`Remote source not supported yet, skipped: ${source.url}`);
      continue;
    }
    const sourceDir = resolve(wowDir, source.url);
    if (visited.has(sourceDir)) {
      warnings.push(`Circular inheritance detected, skipped: ${source.url}`);
      continue;
    }
    try {
      const parentRules = await resolveInto(sourceDir, provider, new Set(visited).add(sourceDir), warnings);
      const files = parentRules.map((rule) => ({
        ...rule,
        provenance: rule.provenance === "local" ? source.url : rule.provenance,
      }));
      layers.push({ provenance: source.url, files });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      warnings.push(`Cannot load source ${source.url}: ${reason}`);
    }
  }

  layers.push({ provenance: "local", files: await provider.loadFiles(wowDir) });
  return resolveChain(layers);
}

/** Resolves a wow/ directory: local rules merged over every reachable inherits_from source. */
export async function resolveRules(wowDir: string, provider: SourceProvider): Promise<ResolveResult> {
  const warnings: string[] = [];
  const root = resolve(wowDir);
  const rules = await resolveInto(root, provider, new Set([root]), warnings);
  return { rules, warnings };
}
