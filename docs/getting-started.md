# Getting Started

> Add codified ways of working to your repository in 15 minutes.

---

## Prerequisites

- A Git repository (any platform: GitHub, GitLab, Azure DevOps)
- A team with at least one agreed-upon practice worth codifying

That's it. No CLI required, no dependencies, no build step.

---

## Step 1: Create the directory

```bash
mkdir -p wow
```

---

## Step 2: Create config.yaml

Every `wow/` directory needs a manifest:

```yaml
# wow/config.yaml
wow_version: "1.0"

files: []  # We'll populate this as we add files
```

---

## Step 3: Write your first WoW file

Start with whatever causes the most friction on your team. Common first choices:

- Definition of Done (most teams have one — it's usually ignored)
- Code review norms (everyone has opinions, rarely written down)
- Architecture principles (the things seniors repeat in every PR review)

Create the file:

```bash
touch wow/definition-of-done.md
```

Add frontmatter + content:

```markdown
---
id: definition-of-done
title: Definition of Done
category: quality
enforcement: soft
owner: "@your-team-lead"
applies_to: [pr]
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

---

## Step 4: Update the manifest

Add your file to `config.yaml`:

```yaml
# wow/config.yaml
wow_version: "1.0"

files:
  - id: definition-of-done
    path: definition-of-done.md
    applies_to: [pr]
    enforcement: soft
```

---

## Step 5: Connect to your AI agent

The fastest integration — create `.github/copilot-instructions.md`:

```markdown
# Copilot Instructions

When reviewing code or generating suggestions, follow the team agreements
defined in the `wow/` directory. Key rules:

## Definition of Done (enforcement: soft)
- New code must have unit tests
- No new lint warnings introduced
- PR description explains the "why", not just the "what"

Flag violations as suggestions during code review.
```

> See the full [Agent Integration Guide](agent-integration.md) for GitHub Actions enforcement and advanced setups.

---

## Step 6: Commit and share

```bash
git add wow/ .github/copilot-instructions.md
git commit -m "feat: add team ways of working (wow/)"
git push
```

Tell your team: *"Our working agreements now live in `wow/`. Read them, challenge them, update them via PR."*

---

## What you have now

```
your-repo/
├── wow/
│   ├── config.yaml
│   └── definition-of-done.md
└── .github/
    └── copilot-instructions.md
```

- ✅ Human-readable team agreements in version control
- ✅ AI agent aware of your norms
- ✅ Changes go through PR review (just like code)
- ✅ Git history shows who changed what and when

---

## Next steps

### Add more rules

Common second files to add:

| File | When to add |
|------|-------------|
| `code-review.md` | Your review norms are tribal knowledge |
| `architecture-principles.md` | Seniors repeat the same feedback on PRs |
| `security-review.md` (enforcement: hard) | You have compliance requirements |

### Add hierarchy (for multi-team orgs)

If your unit or company has shared standards, add `inherits_from` to your config:

```yaml
# wow/config.yaml
wow_version: "1.0"

inherits_from:
  - url: "https://github.com/your-org/company-wow/wow"
    ref: "v1.0"

files:
  - id: definition-of-done
    path: definition-of-done.md
    applies_to: [pr]
    enforcement: soft
```

Your team inherits company rules automatically. See [Inheritance Model](../spec/inheritance-model.md) for details.

### Add automated enforcement

Set up a GitHub Action that posts compliance checklists on every PR. See [Agent Integration Guide — Level 2](agent-integration.md#level-2-github-action-enforcement-week-2-3).

---

## FAQ

**How many files should I start with?**  
One. Seriously. Start with the rule that causes the most repeated friction, prove the concept, then add more.

**Who owns the wow/ directory?**  
The team owns it collectively. Changes go through normal PR review. The `owner` field in each file indicates who's accountable for keeping it current.

**What if we disagree on a rule?**  
Perfect — that's the point. The PR discussion IS the conversation. Better to disagree in a PR than to silently ignore a wiki page.

**Do I need the CLI?**  
Not for getting started. The CLI (`wow validate`, `wow show`) adds value at scale — when you have 10+ files or multi-level inheritance. Start without it.

**Can I use this without AI agents?**  
Absolutely. The files are human-readable first. Agent enforcement is a bonus, not a requirement. Even without agents, you get: version-controlled agreements, PR-based changes, and discoverability in the repo.
