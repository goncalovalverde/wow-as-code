import type { VerifySpec } from "./verify/types.js";

export interface WoWFrontmatter {
  id: string;
  title: string;
  category: "quality" | "architecture" | "delivery" | "collaboration";
  enforcement: "hard" | "soft" | "info";
  owner: string;
  applies_to: string[];
  last_reviewed: string;
  tags?: string[];
  rationale?: string;
  review_by?: string;
  verify?: VerifySpec;
}

export interface WoWFile {
  frontmatter: WoWFrontmatter;
  body: string;
  filePath: string;
}

export interface WoWConfig {
  wow_version: string;
  inherits_from?: InheritSource[];
  files: ConfigFileEntry[];
}

export interface InheritSource {
  url: string;
  ref?: string;
}

export interface ConfigFileEntry {
  path: string;
  id: string;
}

export interface HardRuleConflict {
  lockedBy: string;
  lockedOwner: string;
  attemptedBy: string;
  attemptedFile: string;
  attemptedEnforcement: "soft" | "info";
}

export interface ResolvedRule extends WoWFile {
  provenance: string;
  overriddenBy?: string;
  conflict?: HardRuleConflict;
}

export type OutputFormat = "text" | "json";

export interface ValidationDiagnostic {
  level: "error" | "warning" | "info";
  file: string;
  message: string;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
}
