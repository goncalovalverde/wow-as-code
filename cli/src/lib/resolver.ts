import type { WoWFile, ResolvedRule } from "./types.js";

export interface SourceProvider {
  loadFiles(source: string, ref?: string): Promise<WoWFile[]>;
}

export class FilesystemSourceProvider implements SourceProvider {
  /** Manifest-driven when config.yaml exists; otherwise scans for .md files. */
  async loadFiles(dirPath: string): Promise<WoWFile[]> {
    const { readdir, access } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { parseWoWFile } = await import("./parser.js");
    const { loadConfig } = await import("./config.js");

    const configPath = join(dirPath, "config.yaml");
    const hasManifest = await access(configPath).then(() => true, () => false);

    if (hasManifest) {
      const config = await loadConfig(configPath);
      return Promise.all(config.files.map((entry) => parseWoWFile(join(dirPath, entry.path))));
    }

    const entries = await readdir(dirPath, { recursive: true });
    const mdFiles = entries.filter((e) => e.endsWith(".md") && !e.startsWith("_"));

    const files: WoWFile[] = [];
    for (const file of mdFiles) {
      try {
        const parsed = await parseWoWFile(join(dirPath, file));
        if (parsed.frontmatter.id) files.push(parsed);
      } catch {
        // Skip unparseable files; validate will catch them
      }
    }
    return files;
  }
}

export interface InheritanceLayer {
  provenance: string;
  files: Array<WoWFile & { provenance?: string }>;
}

function isRelaxation(parent: ResolvedRule, child: WoWFile): boolean {
  const childEnforcement = child.frontmatter.enforcement;
  return (
    parent.frontmatter.enforcement === "hard" &&
    (childEnforcement === "soft" || childEnforcement === "info")
  );
}

/** Layers are ordered lowest to highest priority (e.g. company, unit, team). */
export function resolveChain(layers: InheritanceLayer[]): ResolvedRule[] {
  const resolved = new Map<string, ResolvedRule>();

  for (const layer of layers) {
    for (const file of layer.files) {
      const id = file.frontmatter.id;
      const existing = resolved.get(id);
      const provenance = file.provenance ?? layer.provenance;

      if (existing && isRelaxation(existing, file)) {
        resolved.set(id, {
          ...existing,
          overriddenBy: `${provenance} (blocked: cannot relax hard rule)`,
        });
        continue;
      }

      const { provenance: _ignored, ...plain } = file;
      resolved.set(id, {
        ...plain,
        provenance,
        overriddenBy: existing ? existing.provenance : undefined,
      });
    }
  }

  return Array.from(resolved.values());
}

export function resolveInheritance(
  parentFiles: WoWFile[],
  childFiles: WoWFile[],
  parentProvenance: string,
  childProvenance: string
): ResolvedRule[] {
  return resolveChain([
    { provenance: parentProvenance, files: parentFiles },
    { provenance: childProvenance, files: childFiles },
  ]);
}
