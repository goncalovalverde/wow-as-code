# Enforcement Levels

> Part of the [wow-as-code](../README.md) specification.

## Overview

The `enforcement` field determines how agents and tooling treat a WoW rule. This is the key differentiator of wow-as-code — it separates actionable rules from documentation.

## Levels

### `hard` — Agent blocks or warns

- Agent MUST flag violations.
- CI checks SHOULD fail if the rule is not met.
- Cannot be relaxed by lower hierarchy levels.
- Use for: security requirements, compliance gates, non-negotiable standards.

**Example behavior:**
- PR opened without security review label → Agent posts blocking comment.
- CI check fails with explanation of which rule was violated.

### `soft` — Agent suggests

- Agent SHOULD mention the rule when relevant.
- CI checks MAY warn but MUST NOT block.
- Can be overridden by lower hierarchy levels.
- Use for: best practices, preferred approaches, team norms.

**Example behavior:**
- PR has only 1 approval but rule suggests 2 → Agent comments as suggestion, not blocker.
- Code generation includes a note: "Your team prefers X approach for this pattern."

### `info` — Reference only

- Agent MAY surface this when explicitly asked or during onboarding.
- No CI enforcement.
- Can be overridden freely.
- Use for: context, rationale, cultural notes, historical decisions.

**Example behavior:**
- New team member asks "how do we do releases?" → Agent surfaces relevant `info` rules.
- During code generation: no impact unless user specifically asks.

## Agent Behavior Matrix

| Trigger | `hard` | `soft` | `info` |
|---------|--------|--------|--------|
| PR review | Block/warn | Suggest | Ignore |
| Commit push | Fail CI | Warn | Ignore |
| Code generation | Enforce in output | Prefer in output | Ignore |
| Onboarding | Present as requirement | Present as recommendation | Present as context |

## Choosing an Enforcement Level

```
Is this a compliance/security/legal requirement?
  → hard

Is this a best practice the team agreed on?
  → soft

Is this context that helps understanding?
  → info
```

## Governance Guarantee

The `hard` enforcement level is the governance contract between organizational levels:

- A company-level `hard` rule **cannot be relaxed** by any unit or team.
- This gives platform/security/compliance teams confidence that their critical rules are respected.
- Teams retain full autonomy over `soft` and `info` rules.

This balance — governance where it matters, autonomy everywhere else — is the core value proposition of the hierarchy model.
