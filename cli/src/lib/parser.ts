import matter from "gray-matter";
import { readFile } from "node:fs/promises";
import type { WoWFile, WoWFrontmatter } from "./types.js";

function normalizeFrontmatter(data: Record<string, unknown>): WoWFrontmatter {
  // YAML auto-parses unquoted dates as Date objects — convert to ISO date string
  if (data.last_reviewed instanceof Date) {
    data.last_reviewed = data.last_reviewed.toISOString().split("T")[0];
  }
  return data as unknown as WoWFrontmatter;
}

export async function parseWoWFile(filePath: string): Promise<WoWFile> {
  const raw = await readFile(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    frontmatter: normalizeFrontmatter(data),
    body: content.trim(),
    filePath,
  };
}

export function parseWoWContent(
  raw: string,
  filePath: string
): WoWFile {
  const { data, content } = matter(raw);

  return {
    frontmatter: normalizeFrontmatter(data),
    body: content.trim(),
    filePath,
  };
}
