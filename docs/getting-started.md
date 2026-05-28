# Getting Started

> Codify your team's ways of working in 15 minutes.

---

## Prerequisites

- A Git repository (any platform: GitHub, GitLab, Azure DevOps)
- A team with at least one agreed-upon practice worth codifying

That's it. No CLI required, no dependencies, no build step.

---

## Choose your deployment model

| Model | Best for | How |
|-------|----------|-----|
| **Dedicated WoW repo** (recommended) | Teams with multiple product repos, shared codebases, or private rules | Team's rules live in their own repo; product repos read from it |
| **In-repo `wow/` directory** | Solo projects, single-repo teams, open source | Rules live alongside the code |

Most teams at scale should use a **dedicated WoW repo**. It's simpler — one place for all your rules, no duplication, no leaking private agreements into shared repos.

---

## Path A: Dedicated WoW Repo (Recommended)

### Step 1: Create your team's WoW repo

```bash
# Create a private repo for your team's agreements
# e.g., your-org/team-checkout-wow
mkdir team-wow && cd team-wow
git init
mkdir wow
```

### Step 2: Create config.yaml

```yaml
# wow/config.yaml
wow_version: "1.0"

files: []  # We'll populate this as we add files
```

### Step 3: Write your first WoW file

Start with whatever causes the most friction. Common first choices:

- Definition of Done (most teams have one — it's usually ignored)
- Code review norms (everyone has opinions, rarely written down)
- Architecture principles (the things seniors repeat in every PR review)

```markdown
---
id: definition-of-done
title: Definition of Done
category: quality
enforcement: soft
owner: "@your-team-lead"
applies_to: [pr, planning]
last_reviewed: 2026-05-14
tags: [quality-gate]
---

## Checklist

- [ ] Code compiles and passes all existing tests
- [ ] New code has unit tests
- [ ] No new lint warnings introduced
- [ ] PR description explains the "why", not just the "what"

## Exceptions

- Hotfixes during incidents may skip non-critical items with tech lead approval
```

### Step 4: Update the manifest

```yaml
# wow/config.yaml
wow_version: "1.0"

files:
  - id: definition-of-done
    path: definition-of-done.md
    applies_to: [pr, planning]
    enforcement: soft
```

### Step 5: Commit and tag

```bash
git add wow/
git commit -m "feat: initial team ways of working"
git push
git tag v1.0 && git push --tags
```

### Step 6: Connect to your product repos

In each product repo your team works on, add a workflow that reads from the WoW repo:

```yaml
# .github/workflows/wow-check.yml (in your product repo)
name: WoW Compliance Check
on:
  pull_request:
    types: [opened, synchronize, ready_for_review]

jobs:
  wow-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/checkout@v4
        with:
          repository: your-org/team-wow  # your private WoW repo
          token: ${{ secrets.WOW_READ_TOKEN }}
          path: .wow-rules
          ref: v1.0
      - name: Run compliance check
        run: echo "Rules loaded from .wow-rules/wow/"
        # See agent-integration.md for full enforcement logic
```

And add AI awareness via `.github/copilot-instructions.md` in your product repos:

```markdown
# Copilot Instructions

When reviewing code or generating suggestions, follow the team agreements:

## Definition of Done (enforcement: soft)
- New code must have unit tests
- No new lint warnings introduced
- PR description explains the "why", not just the "what"

Flag violations as suggestions during code review.
```

> See [Agent Integration Guide](agent-integration.md) for full CI enforcement.

### What you have now

```
your-org/team-wow/         ← single source of truth (private)
  wow/
    config.yaml
    definition-of-done.md

your-org/product-api/      ← product repo (reads from team-wow)
  .github/
    workflows/wow-check.yml
    copilot-instructions.md

your-org/product-frontend/  ← another product repo (same rules)
  .github/
    workflows/wow-check.yml
    copilot-instructions.md
```

- ✅ One place for all team rules — update once, all repos benefit
- ✅ Rules stay private (never committed to shared/client repos)
- ✅ AI agents aware of norms via copilot-instructions
- ✅ CI enforcement on every PR
- ✅ New product repos get compliance instantly (add the workflow)

---

## Path B: In-Repo `wow/` Directory (Simple/Starter)

For single-repo teams or personal projects, put rules directly in the code repo:

### Step 1: Create the directory and files

```bash
mkdir wow
```

```yaml
# wow/config.yaml
wow_version: "1.0"

files:
  - id: definition-of-done
    path: definition-of-done.md
    applies_to: [pr, planning]
    enforcement: soft
```

### Step 2: Add your WoW file

Same format as Path A — create `wow/definition-of-done.md` with frontmatter + content.

### Step 3: Connect to your AI agent

Create `.github/copilot-instructions.md` referencing the `wow/` directory. Copilot reads this automatically.

### Step 4: Commit

```bash
git add wow/ .github/copilot-instructions.md
git commit -m "feat: add team ways of working (wow/)"
```

**When to graduate to Path A:**
- You start working in multiple repos
- You can't put `wow/` in a shared/client repo
- You want to avoid rule duplication

---

## Next steps

### Add more rules

| File | When to add |
|------|-------------|
| `code-review.md` | Your review norms are tribal knowledge |
| `architecture-principles.md` | Seniors repeat the same feedback on PRs |
| `security-review.md` (enforcement: hard) | You have compliance requirements |
| `onboarding-checklist.md` | New joiners keep missing context |
| `sprint-health.md` | Retros lack data |

### Add hierarchy

If your unit or company has shared standards, add `inherits_from`:

```yaml
# wow/config.yaml
wow_version: "1.0"

inherits_from:
  - url: "https://github.com/your-org/company-wow/wow"
    ref: "v1.0"

files:
  - id: definition-of-done
    path: definition-of-done.md
    applies_to: [pr, planning]
    enforcement: soft
```

Your team inherits company rules automatically. See [Inheritance Model](../spec/inheritance-model.md).

### Add automated enforcement

- [Agent Integration Guide](agent-integration.md) — CI enforcement on PRs
- [Private WoW Source](private-wow-source.md) — for shared/client repos
- [Multi-Repo Teams](multi-repo-teams.md) — managing rules across many repos

---

## FAQ

**Which path should I pick?**  
If your team works in more than one repo, or you work in repos you don't own — Path A (dedicated WoW repo). For a personal project or single-repo team — Path B (in-repo) is fine to start.

**How many files should I start with?**  
One. Start with the rule that causes the most repeated friction, prove the concept, then add more.

**Who owns the WoW repo?**  
The team owns it collectively. Changes go through PR review. The `owner` field in each file indicates who's accountable for keeping it current.

**What if we disagree on a rule?**  
Perfect — that's the point. The PR discussion IS the conversation. Better to disagree in a PR than to silently ignore a wiki page.

**Do I need the CLI?**  
Not for getting started. The CLI (`wow validate`, `wow show`) adds value at scale — when you have 10+ files or multi-level inheritance. Start without it.

**Can I use this without AI agents?**  
Absolutely. The files are human-readable first. Agent enforcement is a bonus, not a requirement. Even without agents, you get: version-controlled agreements, PR-based changes, and discoverability.
