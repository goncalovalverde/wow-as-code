# Verification

A rule can declare how compliance is checked with an optional `verify:` block in its frontmatter. Rules without one remain pure context for agents. `wow check` evaluates every rule that has a verifier and reports a verdict with evidence.

## Verifier types

| `type` | Evaluated by | Verdict |
|--------|--------------|---------|
| `deterministic` | `wow check` | `pass` / `fail` (or `skipped`) |
| `human` | A person | `needs-human`, with the instructions as evidence |
| `llm` | An agent (not the CLI) | `skipped` — advisory only |

**Trust rule:** a `hard` rule MUST NOT use an `llm` verifier. A probabilistic judge may advise but never be the sole gate. `wow validate` rejects it.

## Deterministic checks

```yaml
verify: { type: deterministic, check: file-exists, path: SECURITY.md }   # or file-absent
```

```yaml
verify:
  type: deterministic
  check: pattern
  glob: "src/**/*.ts"        # relative to the repo root
  regex: "AKIA[0-9A-Z]{16}"  # or: contains: "literal text"
  mode: forbid               # forbid | require
```

```yaml
verify:
  type: deterministic
  check: command
  argv: [npm, test]          # no shell; executable plus arguments
  expect_exit: 0
```

```yaml
verify: { type: human, instructions: "A member of @security-team approves the PR." }
verify: { type: llm, prompt: "Does the PR description explain why the change is needed?" }
```

## Safety

- Paths and globs must stay inside the repository root; `node_modules` and `.git` are ignored.
- `pattern` checks read at most 5000 files of up to 256 KB each. Regexes are limited to 200 characters; each regex evaluation is aborted after 1 second and reported as a failure, so a pathological pattern cannot hang `wow check`. Tune the limit with `wow check --regex-timeout <ms>`. Read-only checks run in parallel; `command` checks run one at a time.
- `command` checks run only for **local** rules and only with `--allow-commands`. They never run through a shell, and never run for rules inherited from another source.

## Report

`wow check --format json` prints:

```json
{
  "summary": { "pass": 1, "fail": 0, "skipped": 0, "needs-human": 1, "unverified": 3 },
  "results": [
    { "ruleId": "security-review", "enforcement": "hard", "verifier": "human",
      "provenance": "company", "verdict": "needs-human", "evidence": "..." }
  ],
  "warnings": []
}
```

Every result traces rule → verifier → evidence → verdict, plus the level the rule came from.

## Exit codes

| Condition | Exit |
|-----------|------|
| A `hard` rule fails | 1 |
| A `soft` rule fails | 0 (reported) |
| `--strict`: any failure, or a `hard` rule that still needs a human | 1 |

Use `--trigger pr` to check only the rules that apply to pull requests.

## Diff-scoped checks

`wow check --changed-since <ref>` limits `pattern` checks to files changed between `<ref>` and the working tree (added, copied, modified or renamed). If no matching file changed, the check passes, including `require` mode. File and command checks are unaffected. Use it in PR pipelines, for example `--changed-since origin/main`.
