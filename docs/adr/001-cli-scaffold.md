# ADR-001: CLI Scaffold — Language, Structure, and Placement

- **Status:** Accepted
- **Date:** 2026-05-20
- **Decision makers:** @goncalovalverde

## Context

The wow-as-code spec needs tooling to validate files, resolve inheritance, and scaffold new directories. The CLI is a v1 deliverable and will also power the GitHub Action.

## Decision

- **Language:** TypeScript (Node 20+)
- **Placement:** `cli/` directory inside the spec repo, as a standalone package (extractable later)
- **CLI framework:** Commander (lightweight, sufficient for 3 commands)
- **Build:** tsup (esbuild-based, fast)
- **Test:** vitest
- **Architecture:**
  - Thin command handlers delegate to `lib/` services
  - `SourceProvider` interface abstracts file loading (filesystem now, remote later)
  - Machine-readable `--format json` output for GitHub Action integration

## Alternatives Considered

| Option | Rejected because |
|--------|-----------------|
| Python | Slower GitHub Action startup; doesn't share ecosystem with Copilot extensions |
| Separate repo | Adds coordination overhead; spec and CLI evolve together in v1 |
| oclif | Over-engineered for 3 commands |
| yargs | Equivalent to Commander; no compelling advantage |

## Consequences

- TypeScript requires a build step (tsup handles this)
- Future extraction to a separate package is straightforward (standalone package.json, no shared deps)
- GitHub Action can import `lib/` directly without CLI overhead
