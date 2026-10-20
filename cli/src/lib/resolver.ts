import type { WoWFile, ResolvedRule } from "./types.js";

export interface SourceProvider {
  loadFiles(source: string, ref?: string): Promise<WoWFile[]>;
}

export class FilesystemSourceProvider implements SourceProvider {
  async loadFiles(dirPath: string): Promise<WoWFile[]> {
    const { readdir } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { parseWoWFile } = await import("./parser.js");

    const entries = await readdir(dirPath, { recursive: true });
    const mdFiles = entries.filter(
      (e) => e.endsWith(".md") && !e.startsWith("_")
    );

    const files: WoWFile[] = [];
    for (const file of mdFiles) {
      try {
        const parsed = await parseWoWFile(join(dirPath, file));
        files.push(parsed);
      } catch {
        // Skip unparseable files; validate will catch them
      }
    }

    return files;
  }
}

export function resolveInheritance(
  parentFiles: WoWFile[],
  childFiles: WoWFile[],
  parentProvenance: string,
  childProvenance: string
): ResolvedRule[] {
  const resolved = new Map<string, ResolvedRule>();

  // Load parent rules first
  for (const file of parentFiles) {
    resolved.set(file.frontmatter.id, {
      ...file,
      provenance: parentProvenance,
    });
  }

  // Child overrides parent (unless parent is hard and child relaxes)
  for (const file of childFiles) {
    const parentRule = resolved.get(file.frontmatter.id);

    if (parentRule && parentRule.frontmatter.enforcement === "hard") {
      const childEnforcement = file.frontmatter.enforcement;
      if (childEnforcement === "soft" || childEnforcement === "info") {
        // Cannot relax a hard rule — keep parent, mark conflict
        resolved.set(file.frontmatter.id, {
          ...parentRule,
          overriddenBy: `${childProvenance} (blocked: cannot relax hard rule)`,
        });
        continue;
      }
    }

    resolved.set(file.frontmatter.id, {
      ...file,
      provenance: childProvenance,
      overriddenBy: parentRule ? parentProvenance : undefined,
    });
  }

  return Array.from(resolved.values());
}
