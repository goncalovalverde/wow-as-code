# ADR-004: Rule Verification and `wow check`

- **Status:** Accepted
- **Date:** 2026-10-20
- **Decision makers:** @goncalovalverde

## Context and Problem Statement

Rules are prose, so enforcement meant "an agent reads it and judges". ADR-002 decided on a hybrid model with a declared verifier per rule and no LLM-only gate on `hard` rules. This ADR records how v1.2 implements it.

## Decision

1. Optional `verify:` frontmatter, validated by `spec/schema.json` (`oneOf` per verifier shape). Documented in `spec/verification.md`.
2. Verifier types: `deterministic` (`file-exists`, `file-absent`, `pattern`, `command`), `human`, `llm`.
3. The schema forbids `llm` on `hard` rules, so the trust principle is enforced by `wow validate`, not by convention.
4. `wow check` produces one structured report (`rule → verifier → evidence → verdict → provenance`) as text or JSON. Exit 1 when a `hard` rule fails; `--strict` extends this to soft failures and unverifiable hard rules.
5. The CLI does not call an LLM. `llm` verdicts are `skipped`, left for an agent (for example via `wow mcp`). This avoids secrets, cost and non-determinism in the CLI.
6. **Code-execution safety:** `command` checks are `argv` arrays run with `execFile` (no shell), only for rules with local provenance, and only with `--allow-commands`. A remote or inherited rule can never execute code.
7. File and glob checks are confined to the repository root, skip `node_modules` and `.git`, and cap file count and size.

## Alternatives Considered

| Option | Rejected because |
|--------|-----------------|
| Arbitrary shell strings in rules | Remote or inherited rules would become remote code execution |
| Built-in LLM judge | Needs credentials and is non-deterministic; unsuitable as a gate |
| Safe regex engine (RE2) | Native dependency; limits and trusted sources are enough for now |
| Only deterministic verifiers | Many real rules need a human or an agent |

## Consequences

- Teams can start with zero verifiers and add them per rule.
- A pathological regex from an inherited source could be slow; sources are treated as trusted (see ADR-003).
- Compiled files (`wow sync`) do not yet mention how a rule is verified.

See [verification-flow.mmd](../diagrams/verification-flow.mmd).
