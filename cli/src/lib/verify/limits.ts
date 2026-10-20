/** Safety limits for verification. Central so they are documented and tuned in one place. */
export const LIMITS = {
  maxFiles: 5000,
  maxFileBytes: 256 * 1024,
  maxEvidenceFiles: 10,
  maxRegexTimeouts: 3,
  defaultRegexTimeoutMs: 1000,
  commandTimeoutMs: 120_000,
  maxParallelChecks: 8,
  ignoredDirs: ["**/node_modules/**", "**/.git/**"],
} as const;
