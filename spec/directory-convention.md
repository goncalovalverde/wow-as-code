# Directory Convention

> Part of the [wow-as-code](../README.md) specification.

## Overview

A `wow/` directory contains a team's codified Ways of Working. This directory is **visible** (no dot-prefix) because these files are meant to be discovered and read by humans — not hidden as infrastructure.

## Deployment Models

### Dedicated WoW repo (recommended for teams)

The `wow/` directory lives in its own private repository. Product repos read from it at CI time via cross-repo checkout.

```
your-org/team-wow/          ← private, team-owned
  wow/
  ├── config.yaml
  ├── code-review.md
  └── definition-of-done.md

your-org/product-api/       ← product repo (no wow/ here)
  .github/
    workflows/wow-check.yml ← reads from team-wow at runtime
```

**When to use:** teams with multiple repos, shared/client codebases, private rules.

See [Multi-Repo Teams](../docs/multi-repo-teams.md) and [Private WoW Source](../docs/private-wow-source.md).

### In-repo `wow/` directory (simple/starter)

The `wow/` directory lives at the root of a code repository.

```
your-repo/
  wow/
  ├── config.yaml
  ├── code-review.md
  └── definition-of-done.md
```

**When to use:** single-repo teams, personal projects, open source repos.

---

## Structure

### Flat (recommended for ≤15 files)

```
wow/
├── config.yaml
├── code-review.md
├── definition-of-done.md
└── architecture-principles.md
```

### Categorized (recommended for >15 files)

```
wow/
├── config.yaml
├── quality/
│   ├── code-review.md
│   └── definition-of-done.md
├── architecture/
│   └── principles.md
├── delivery/
│   └── release-process.md
└── collaboration/
    └── onboarding-checklist.md
```

## Rules

1. **`config.yaml` is always required** — it contains the manifest and inheritance configuration.
2. **Categories are fixed:** `quality`, `architecture`, `delivery`, `collaboration`. No custom subdirectories.
3. **The `category` frontmatter field MUST match the subdirectory name** (if using categorized structure).
4. **Both flat and categorized structures are valid.** The CLI `wow validate` accepts both.
5. **Agents never traverse directories** — they read the manifest in `config.yaml` and load files by path.

## File Format

Each WoW file is a Markdown file with YAML frontmatter:

```markdown
---
id: code-review
title: Code Review Norms
category: quality
enforcement: soft
owner: @tech-lead
applies_to: [pr]
last_reviewed: 2026-05-01
tags: [collaboration, quality-gate]
---

## Rule

All pull requests require at least 2 approvals before merge.

## Rationale

Two reviewers catch more issues than one and spread knowledge across the team.

## Exceptions

- Hotfixes during incidents may merge with 1 approval from an on-call engineer.
```

## Naming

- File names use kebab-case: `code-review.md`, `definition-of-done.md`
- File names SHOULD match the `id` field in frontmatter
- No spaces, no uppercase, no special characters
