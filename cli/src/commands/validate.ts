import { Command } from "commander";
import { resolve, join } from "node:path";
import { readdir } from "node:fs/promises";
import { loadConfig } from "../lib/config.js";
import { parseWoWFile } from "../lib/parser.js";
import { validateFiles } from "../lib/schema.js";
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
    for (const entry of config.files) {
      const filePath = join(wowDir, entry.path);
      try {
        const parsed = await parseWoWFile(filePath);
        files.push(parsed);

        // Check ID consistency
        if (parsed.frontmatter.id !== entry.id) {
          diagnostics.push({
            level: "error",
            file: entry.path,
            message: `ID mismatch: config.yaml says "${entry.id}" but frontmatter says "${parsed.frontmatter.id}"`,
            field: "id",
          });
        }
      } catch (err) {
        diagnostics.push({
          level: "error",
          file: entry.path,
          message: err instanceof Error ? err.message : "Failed to parse file",
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

    const valid = diagnostics.filter((d) => d.level === "error").length === 0;
    outputResults({ valid, diagnostics }, format);

    if (!valid) process.exit(1);
  });

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
