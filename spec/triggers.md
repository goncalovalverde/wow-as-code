# Triggers

> Part of the [wow-as-code](../README.md) specification.

## Overview

The `applies_to` field in each WoW file declares **when** an agent should load and evaluate that rule. Triggers connect team agreements to moments in the development workflow.

Agents read the manifest (`config.yaml`), filter files by the current trigger, and load only matching rules. This keeps agent context small and relevant.

---

## Core Triggers (v1)

These triggers MUST be supported by all compliant tooling.

### `pr`

**Fires when:** A pull request is opened, updated (new commits pushed), or reviewed.

**Agent behavior:**
- Load all WoW files with `applies_to` containing `pr`
- Evaluate the PR diff and metadata against the rules
- `hard` rules → post blocking comment or fail CI check
- `soft` rules → post suggestion comment

**Typical files:** code-review norms, definition of done, security review requirements

**Example:**
```yaml
applies_to: [pr]
enforcement: hard
```
→ Agent flags violations as blocking on every PR.

---

### `commit`

**Fires when:** Code is pushed to a branch, or during a pre-commit/pre-push hook.

**Agent behavior:**
- Load all WoW files with `applies_to` containing `commit`
- Validate the commit(s) against the rules
- `hard` rules → fail the CI check or reject the push
- `soft` rules → warn in CI output

**Typical files:** security review requirements, commit message conventions

**Example:**
```yaml
applies_to: [pr, commit]
enforcement: hard
```
→ Rule is checked both on individual commits AND on the PR as a whole.

---

### `code-generation`

**Fires when:** An AI agent is generating, suggesting, or completing code.

**Agent behavior:**
- Load all WoW files with `applies_to` containing `code-generation`
- Apply rules as constraints or preferences when producing code
- `hard` rules → generated code MUST comply (e.g., "all public APIs must be versioned")
- `soft` rules → generated code SHOULD comply (e.g., "prefer async communication")

**Typical files:** architecture principles, coding standards, naming conventions

**Example:**
```yaml
applies_to: [code-generation]
enforcement: soft
```
→ Agent prefers this pattern when writing code but doesn't enforce strictly.

---

### `onboarding`

**Fires when:** A new team member requests context, or an agent is explicitly asked about team norms ("how do we do X?").

**Agent behavior:**
- Load all WoW files with `applies_to` containing `onboarding`
- Present rules as a structured overview of team practices
- `hard` rules → present as non-negotiable requirements
- `soft` rules → present as team recommendations
- `info` rules → present as helpful context

**Typical files:** all files (most teams tag key files with `onboarding` for discoverability)

**Example:**
```yaml
applies_to: [pr, onboarding]
enforcement: soft
```
→ Rule is enforced during PRs AND surfaced during onboarding.

---

## Trigger Matching

### Multiple triggers on one file

A file with `applies_to: [pr, commit, onboarding]` matches ANY of those triggers (OR logic). The agent loads the file if the current context matches at least one trigger.

### No trigger filtering

If an agent cannot determine the current trigger (e.g., a generic chat context), it SHOULD fall back to loading all files and treating them as `info` level — surfacing rules on request without enforcement.

### Manifest as fast path

Agents MUST use the `applies_to` field in `config.yaml` (the manifest) to filter files. Agents MUST NOT traverse the directory and open every file to read frontmatter — the manifest exists to avoid this.

```yaml
# config.yaml — agent reads this, filters, then loads only matching files
files:
  - id: code-review
    path: code-review.md
    applies_to: [pr]          # ← agent filters here
    enforcement: soft
  - id: architecture
    path: architecture.md
    applies_to: [code-generation]  # ← skip if current trigger is "pr"
    enforcement: soft
```

---

## Custom Triggers

Teams MAY define custom triggers for contexts not covered by the core set.

### Rules

1. Custom triggers MUST use the `custom:` prefix: `custom:retro`, `custom:incident`
2. Compliant tooling MUST ignore triggers it does not recognize (forward-compatible)
3. Custom triggers follow the same matching logic as core triggers

### Example

```yaml
applies_to: [pr, custom:architecture-review]
enforcement: soft
```

A team-built tool that runs architecture reviews can filter for `custom:architecture-review`. Standard tooling ignores the custom trigger and still matches this file on `pr`.

---

## Reserved Triggers (v2)

The following triggers are reserved for future versions. Teams SHOULD NOT use these as custom trigger names:

| Trigger | Planned use |
|---------|-------------|
| `design-doc` | Design document creation or review |
| `incident` | Incident response activated |
| `retro` | Retrospective context |
| `meeting` | Meeting or ritual context |
| `review` | Non-PR review (e.g., architecture review board) |

---

## Summary

| Trigger | When | Enforcement surface |
|---------|------|---------------------|
| `pr` | PR opened/updated/reviewed | PR comments, CI checks |
| `commit` | Code pushed, pre-commit hooks | CI checks, push rejection |
| `code-generation` | Agent writing/suggesting code | Generated output |
| `onboarding` | New joiner context, explicit questions | Chat responses |
| `custom:*` | Team-defined contexts | Team-built tooling |
