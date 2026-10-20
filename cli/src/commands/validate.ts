import { Command } from "commander";
import { resolve, join } from "node:path";
import { readdir } from "node:fs/promises";
import { loadConfig } from "../lib/config.js";
import { parseManifestEntries } from "../lib/manifest.js";
import { validateFiles } from "../lib/schema.js";
import { findReviewDiagnostics } from "../lib/staleness.js";
import { findConflictDiagnostics, findSiblingConflictDiagnostics } from "../lib/conflicts.js";
import { resolveRules } from "../lib/load.js";
import { createSourceProvider } from "../lib/sources.js";
import type { OutputFormat, ValidationDiagnostic, WoWFile } from "../lib/types.js";

export const validateCommand = new Command("validate")
  .description("Validate wow/ files against schema and config manifest")
  .option("-d, --dir <path>", "wow directory path", "wow")
  .option("-f, --format <format>", "output format (text|json)", "text")
  .action(async (options) => {
    const format: OutputFormat = options.format;
    const wowDir = resolve(process.cwd(), options.dir);
    const diagnostics: ValidationDiagnostic[] = [];

    // Load config
    const configPath = join(wowDir, "config.yaml");
    let config;
    try {
      config = await loadConfig(configPath);
    } catch (err) {
      diagnostics.push({
        level: "error",
        file: "config.yaml",
        message: err instanceof Error ? err.message : "Failed to load config.yaml",
      });
      outputResults({ valid: false, diagnostics }, format);
      process.exit(1);
    }

    // Parse all wow files
    const files: WoWFile[] = [];
    for (const { entry, file, error } of await parseManifestEntries(wowDir, config)) {
      if (error || !file) {
        diagnostics.push({
          level: "error",
          file: entry.path,
          message: error?.message ?? "Failed to parse file",
        });
        continue;
      }
      files.push(file);
      if (file.frontmatter.id !== entry.id) {
        diagnostics.push({
          level: "error",
          file: entry.path,
          message: `ID mismatch: config.yaml says "${entry.id}" but frontmatter says "${file.frontmatter.id}"`,
          field: "id",
        });
      }
    }

    // Check for files in directory not listed in config
    try {
      const dirEntries = await readdir(wowDir);
      const mdFiles = dirEntries.filter(
        (e) => e.endsWith(".md") && !e.startsWith("_")
      );
      const configPaths = new Set(config.files.map((f) => f.path));
      for (const mdFile of mdFiles) {
        if (!configPaths.has(mdFile)) {
          diagnostics.push({
            level: "warning",
            file: mdFile,
            message: "File exists in wow/ but is not listed in config.yaml",
          });
        }
      }
    } catch {
      // Directory read failed — already caught above
    }

    // Validate frontmatter against schema
    const schemaResult = await validateFiles(files);
    diagnostics.push(...schemaResult.diagnostics);
    diagnostics.push(...findReviewDiagnostics(files, new Date()));
    diagnostics.push(...(await checkInheritance(wowDir, diagnostics)));

    const valid = diagnostics.filter((d) => d.level === "error").length === 0;
    outputResults({ valid, diagnostics }, format);

    if (!valid) process.exit(1);
  });

async function checkInheritance(
  wowDir: string,
  existing: ValidationDiagnostic[]
): Promise<ValidationDiagnostic[]> {
  const provider = createSourceProvider();
  try {
    const { rules, warnings, siblingConflicts } = await resolveRules(wowDir, provider);
    return [
      ...findConflictDiagnostics(rules),
      ...findSiblingConflictDiagnostics(siblingConflicts),
      ...warnings.map((message) => ({ level: "warning" as const, file: "config.yaml", message })),
    ];
  } catch (error) {
    // Parse failures are already reported per file; only surface unexpected ones
    if (existing.some((diag) => diag.level === "error")) return [];
    const message = error instanceof Error ? error.message : "Failed to resolve inheritance";
    return [{ level: "error", file: "config.yaml", message }];
  } finally {
    await provider.dispose?.();
  }
}

function outputResults(
  result: { valid: boolean; diagnostics: ValidationDiagnostic[] },
  format: OutputFormat
): void {
  if (format === "json") {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.valid && result.diagnostics.length === 0) {
    console.log("✓ All wow/ files are valid.");
    return;
  }

  for (const diag of result.diagnostics) {
    const icon = diag.level === "error" ? "✗" : diag.level === "warning" ? "⚠" : "ℹ";
    console.log(`${icon} [${diag.file}] ${diag.message}`);
  }

  if (result.valid) {
    console.log(`\n✓ Valid (with ${result.diagnostics.length} warning(s))`);
  } else {
    const errors = result.diagnostics.filter((d) => d.level === "error").length;
    console.log(`\n✗ Invalid: ${errors} error(s) found.`);
  }
}
