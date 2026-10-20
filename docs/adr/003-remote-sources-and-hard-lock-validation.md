# ADR-003: Remote Sources, Source Provider Contract and Hard-Lock Validation

- **Status:** Accepted
- **Date:** 2026-10-20
- **Decision makers:** @goncalovalverde

## Context and Problem Statement

`inherits_from` pointed at Git URLs, but the CLI could only read local directories, so inherited `hard` rules were silently skipped. `wow validate` also did not detect a lower level relaxing a `hard` rule, although `spec/inheritance-model.md` says it MUST. The `SourceProvider` interface was filesystem-shaped and `lib/load.ts` read `config.yaml` itself.

## Decision

1. **Provider contract:** `SourceProvider.load(source, { baseDir, ref })` returns a `LoadedSource` (`id`, `location`, `files`, `inheritsFrom`) and has an optional `dispose()`. The loader only talks to this contract, so new providers need no loader change.
2. **Providers:** `FilesystemSourceProvider` (local paths), `GitSourceProvider` (shallow clone of `ref` into a temp dir), and a router (`createSourceProvider`) that sends URL-style sources to Git and everything else to the filesystem.
3. **Source URL format:** `https://host/owner/repo/<subpath>` — the repo is the first two path segments, or everything up to the first `.git` segment; the rest is the `wow/` subpath. `ref` is mandatory for remote sources.
4. **Security controls (remote content is injected into agents):**
   - Only `https` and `ssh` schemes; `file` only via an explicit option (tests).
   - `git` is run with `execFile` (no shell), `--` before positional arguments, strict ref and URL validation, `GIT_TERMINAL_PROMPT=0`, 60s timeout.
   - Path traversal rejected; symlinks and manifest paths must resolve inside the clone.
   - `WOW_TOKEN`/`GH_TOKEN` is passed through `GIT_CONFIG_*` environment variables (never argv) and only for `github.com`.
5. **Failure policy:** an unreachable source is a warning (per spec) and `wow sync --strict` turns it into a failure. Circular inheritance is reported as a warning.
6. **Hard-lock validation:** `resolveChain` records a structured `conflict` on a rule when a lower layer tries to relax it; `wow validate` reports each as an error using the spec's message format.

## Alternatives Considered

| Option | Rejected because |
|--------|-----------------|
| Token in clone URL | Leaks via process list and error messages |
| Shell `git clone` string | Command injection risk |
| Fail hard on unreachable sources | Spec requires a warning when offline; `--strict` covers CI |
| Fetch via GitHub API | Locks the CLI to one host; Git works for any host |

## Consequences

- Inherited `hard` rules are now actually applied and enforced by `validate`.
- Remote loading requires `git` on the PATH.
- Self-hosted hosts with nested group paths must use a `.git` segment to mark the repo boundary.
- Tokens are only sent to `github.com`; other private hosts rely on the user's own Git credential setup.

## Diagram

See [source-providers.mmd](../diagrams/source-providers.mmd).
