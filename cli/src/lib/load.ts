import { detectSiblingHardConflicts, type SiblingHardConflict } from "./conflicts.js";
import { resolveChain, type InheritanceLayer, type SourceProvider } from "./resolver.js";
import type { ResolvedRule } from "./types.js";

export interface ResolveResult {
  rules: ResolvedRule[];
  warnings: string[];
  siblingConflicts: SiblingHardConflict[];
}

interface ResolveContext {
  provider: SourceProvider;
  warnings: string[];
  siblingConflicts: SiblingHardConflict[];
}

async function resolveSource(
  source: string,
  label: string,
  context: ResolveContext,
  chain: ReadonlySet<string>,
  options: { baseDir?: string; ref?: string }
): Promise<ResolvedRule[]> {
  const loaded = await context.provider.load(source, options);
  if (chain.has(loaded.id)) {
    throw new Error(`Circular inheritance detected at ${loaded.id}`);
  }
  const nextChain = new Set(chain).add(loaded.id);
  const layers: InheritanceLayer[] = [];

  for (const parent of loaded.inheritsFrom) {
    try {
      const parentRules = await resolveSource(parent.url, parent.url, context, nextChain, {
        baseDir: loaded.location,
        ref: parent.ref,
      });
      layers.push({ provenance: parent.url, files: parentRules });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      context.warnings.push(`Cannot load source ${parent.url}: ${reason}`);
    }
  }

  const localIds = new Set(loaded.files.map((file) => file.frontmatter.id));
  context.siblingConflicts.push(...detectSiblingHardConflicts(layers, localIds));

  layers.push({ provenance: label, files: loaded.files });
  return resolveChain(layers);
}

/** Resolves a wow/ directory: local rules merged over every reachable inherits_from source. */
export async function resolveRules(wowDir: string, provider: SourceProvider): Promise<ResolveResult> {
  const context: ResolveContext = { provider, warnings: [], siblingConflicts: [] };
  const rules = await resolveSource(wowDir, "local", context, new Set(), {});
  return { rules, warnings: context.warnings, siblingConflicts: context.siblingConflicts };
}
