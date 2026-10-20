import type { ValidationDiagnostic, WoWFile } from "./types.js";

export function findReviewDiagnostics(files: WoWFile[], today: Date): ValidationDiagnostic[] {
  const todayIso = today.toISOString().split("T")[0];
  return files
    .filter((file) => file.frontmatter.review_by && file.frontmatter.review_by < todayIso)
    .map((file) => ({
      level: "warning" as const,
      file: file.filePath,
      field: "review_by",
      message: `Rule "${file.frontmatter.id}" is past its review date (${file.frontmatter.review_by})`,
    }));
}
