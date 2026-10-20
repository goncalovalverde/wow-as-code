export type VerifySpec =
  | { type: "deterministic"; check: "file-exists" | "file-absent"; path: string }
  | {
      type: "deterministic";
      check: "pattern";
      glob: string;
      mode: "forbid" | "require";
      contains?: string;
      regex?: string;
    }
  | { type: "deterministic"; check: "command"; argv: string[]; expect_exit?: number }
  | { type: "human"; instructions: string }
  | { type: "llm"; prompt: string };

export type Verdict = "pass" | "fail" | "skipped" | "needs-human";

export interface CheckResult {
  verdict: Verdict;
  evidence: string;
}

export interface CheckContext {
  root: string;
  provenance: string;
  allowCommands: boolean;
  regexTimeoutMs?: number;
}

export interface RuleResult extends CheckResult {
  ruleId: string;
  enforcement: "hard" | "soft" | "info";
  verifier: string;
  provenance: string;
}

export interface CheckReport {
  summary: Record<Verdict, number> & { unverified: number };
  results: RuleResult[];
}
