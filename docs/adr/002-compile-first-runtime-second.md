# ADR-002: Compile-first, Runtime-second — Agent Context Provider Direction

- **Status:** Proposed
- **Date:** 2026-10-20
- **Decision makers:** @goncalovalverde

## Context

wow-as-code defines rules well but does little to get them *applied*. AI coding tools (Copilot, Claude Code, Cursor, Kiro, Spec Kit) already consume instruction files (`AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `copilot-instructions.md`) and MCP servers. Spec-driven development adds a lifecycle (spec → plan → tasks → implement → verify) that WoW does not yet model. Teams also work in methodology-neutral and human+AI hybrid ways, not only Scrum/Kanban.

## Decision

1. **Product direction:** context provider for agents first (C), growing into a methodology-agnostic operating system for human+AI teams (D), with a policy/verification engine (B) as an optional layer.
2. **Source of truth:** `wow/` is the only source. Generated files are one-way compiled, carry a "DO NOT EDIT" header, and `wow sync --check` fails CI on drift. No two-way sync (it would let lower levels bypass `hard` locks).
3. **Delivery channels:** compiled files (universal) plus an MCP server (`wow mcp`, live and trigger-aware), both backed by the same resolver.
4. **Workflows, then agent roles:** methodology-neutral workflow files (phases, artifacts, performer human/agent/both, exit gates), then agent roles (scope, autonomy level, approval checkpoints). Scrum and Kanban become example workflows.
5. **Verification:** per-rule `verify: { type: deterministic | llm | human }`. A `hard` rule must have a deterministic or human verifier; an LLM can advise but never be the sole gate. Results use one structured report format with rule → evidence → verdict traceability. Rules without `verify:` remain pure context.
6. **Feedback loop:** add `rationale` and `review_by` to the schema now. Telemetry is local/in-repo (NDJSON or CI artifact) with `wow report`; optional org-wide aggregation later. Agent-proposed rule changes come after real data exists.
7. **Extensibility:** shareable versioned packs (`extends: [pack@1.2]`, resolved via `SourceProvider`), a plugin interface for custom triggers/verifiers, namespaced `x-` extension fields, and a `wow.lock` with checksums. A pack cannot silently downgrade a `hard` rule. No registry in the near term.
8. **Sequencing:** v1.0 `wow sync` + drift check + schema fields; v1.1 MCP server + `wow show --trigger`; v1.2 `verify:` + `wow check` + report; v2 workflows, roles, packs, lockfile, `wow report`; v3 plugin API, org dashboard, agent-proposed changes. New spec additions are marked experimental (`x-`) until proven.

## Alternatives Considered

| Option | Rejected because |
|--------|-----------------|
| Rule format + validator only | Leaves rules unapplied; no adoption path into agent tooling |
| Two-way sync with generated files | Merge complexity; undermines `hard` governance |
| LLM-only enforcement | Non-deterministic; unsafe as a sole gate for `hard` rules |
| Hosted registry now | Maintenance and trust burden; git/npm sources suffice |
| Big-bang v2 spec first | Delays feedback; the first slice is small and demoable |

## Consequences

- Reuses the existing resolver and `SourceProvider`; first slice is low-cost.
- Roadmap's `wow compile` is renamed/aligned to `wow sync` with a `--check` mode.
- Pack content is injected into agents, so trust controls (checksums, lockfile) are mandatory.
- Spec grows; additive changes keep v1 files valid.
