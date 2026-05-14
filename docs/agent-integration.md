# Agent Integration Guide

> How to connect your `wow/` directory to AI agents so they enforce your team's ways of working.

---

## Overview

The wow-as-code framework is designed for pull-based agent consumption. Agents read your `wow/` files at runtime and apply them during code generation, PR review, and onboarding.

This guide covers integration with **GitHub Copilot** on GitHub Enterprise, but the principles apply to any AI coding assistant.

---

## Level 1: Copilot Custom Instructions (Day 1 — zero tooling)

The fastest way to make Copilot aware of your team's ways of working.

### Setup

Create `.github/copilot-instructions.md` in your repository:

```markdown
# Copilot Instructions

## Ways of Working

This repository follows codified team agreements stored in the `wow/` directory.
When generating code, reviewing PRs, or answering questions, consider these rules:

### Code Review Norms (enforcement: soft)
- All PRs require at least 2 approvals before merge
- Performance-sensitive changes require review from the performance team

### Definition of Done (enforcement: soft)
- New code must have unit tests (≥80% coverage for new lines)
- API changes must be documented in the OpenAPI spec
- No new lint warnings introduced
- PR description explains the "why", not just the "what"

### Architecture Principles (enforcement: soft)
- No direct database access from services — use the data access layer
- Prefer async communication between services via message queues
- All public APIs must be versioned using URL path versioning

### Security Review (enforcement: hard)
- All PRs modifying authentication, authorization, or data handling code
  MUST include approval from the security team. Do not approve or suggest
  bypassing this requirement.

When reviewing code or generating suggestions, flag violations of these
rules — especially `hard` enforcement rules which are non-negotiable.
```

### Why this works

- Copilot reads this file automatically for every interaction in the repo
- No build step, no tooling, no dependencies
- Team members see the rules every time they look at the file
- Takes 10 minutes to set up

### Limitations

- Manual sync — if `wow/` files change, you must update this file
- No inheritance resolution — you're flattening rules manually
- No filtering by trigger — Copilot sees all rules regardless of context

---

## Level 2: GitHub Action Enforcement (Week 2-3)

A GitHub Action that reads `wow/` files and posts a compliance comment on every PR.

### How it works

```
PR opened → Action triggers → Reads wow/config.yaml → 
Filters by applies_to: [pr] → Evaluates rules → Posts comment
```

### Example workflow

```yaml
# .github/workflows/wow-check.yml
name: WoW Compliance Check
on:
  pull_request:
    types: [opened, synchronize, ready_for_review]

jobs:
  wow-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Read WoW manifest
        id: manifest
        run: |
          # Parse config.yaml, filter files with applies_to containing "pr"
          echo "Reading wow/config.yaml..."
          PR_FILES=$(yq '.files[] | select(.applies_to[] == "pr") | .path' wow/config.yaml)
          echo "pr_files<<EOF" >> $GITHUB_OUTPUT
          echo "$PR_FILES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Generate compliance checklist
        id: checklist
        run: |
          # For each applicable wow file, extract rules and build checklist
          CHECKLIST="## ✅ Ways of Working Compliance\n\n"
          CHECKLIST+="Based on your team's codified agreements in \`wow/\`:\n\n"
          
          while IFS= read -r file; do
            [ -z "$file" ] && continue
            TITLE=$(yq --front-matter=extract '.title' "wow/$file")
            ENFORCEMENT=$(yq --front-matter=extract '.enforcement' "wow/$file")
            
            if [ "$ENFORCEMENT" = "hard" ]; then
              ICON="🔴"
              LABEL="REQUIRED"
            else
              ICON="🟡"
              LABEL="recommended"
            fi
            
            CHECKLIST+="### $ICON $TITLE ($LABEL)\n"
            # Extract checklist items or rules from markdown body
            RULES=$(sed -n '/^## Rule\|^## Checklist/,/^## /p' "wow/$file" | grep -E '^\- \[' || echo "- [ ] Review compliance with this rule")
            CHECKLIST+="$RULES\n\n"
          done <<< "${{ steps.manifest.outputs.pr_files }}"
          
          echo "checklist<<EOF" >> $GITHUB_OUTPUT
          echo -e "$CHECKLIST" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Post PR comment
        uses: actions/github-script@v7
        with:
          script: |
            const body = `${{ steps.checklist.outputs.checklist }}
            
            ---
            *Generated from \`wow/\` — [learn more](../../tree/main/wow)*`;
            
            // Find existing comment to update (avoid spam)
            const comments = await github.rest.issues.listComments({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number
            });
            
            const existing = comments.data.find(c => 
              c.body.includes('Ways of Working Compliance')
            );
            
            if (existing) {
              await github.rest.issues.updateComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: existing.id,
                body
              });
            } else {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.issue.number,
                body
              });
            }
```

### What the PR comment looks like

```
## ✅ Ways of Working Compliance

Based on your team's codified agreements in `wow/`:

### 🔴 Security Review Requirements (REQUIRED)
- [ ] PR modifying auth/data handling has security team approval

### 🟡 Code Review Norms (recommended)
- [ ] At least 2 approvals obtained
- [ ] Performance-sensitive changes reviewed by perf team

### 🟡 Definition of Done (recommended)
- [ ] New code has unit tests (≥80% coverage)
- [ ] API changes documented in OpenAPI spec
- [ ] No new lint warnings introduced
- [ ] PR description explains the "why"

---
*Generated from `wow/` — [learn more](../../tree/main/wow)*
```

### Why this works

- Visible on every PR — impossible to ignore
- `hard` rules stand out visually (🔴)
- Updates automatically when wow/ files change
- No manual checklist maintenance
- Serves as onboarding — new joiners learn norms by opening PRs

---

## Level 3: Copilot Custom Skills (Week 4+)

> ⚠️ Advanced — requires GitHub Copilot Extensions or custom agent setup.

Create a Copilot skill that dynamically reads `wow/` files based on context:

### Concept

```
wow/
├── config.yaml          ← Agent reads manifest
└── ...files...          ← Agent loads only matching files

.github/copilot/skills/
└── wow-enforcer.md      ← Skill that instructs Copilot how to use wow/
```

### Example skill file

```markdown
---
name: wow-enforcer
description: Enforce team ways of working from the wow/ directory
---

When reviewing code or generating suggestions:

1. Read `wow/config.yaml` to get the file manifest.
2. Identify the current context (PR review, code generation, etc.).
3. Load only files where `applies_to` matches the current context.
4. For each loaded rule:
   - If `enforcement: hard` — flag violations as blocking issues.
   - If `enforcement: soft` — mention as suggestions.
   - If `enforcement: info` — only surface if explicitly asked.
5. When showing violations, cite the specific wow/ file and rule.
```

### Why this matters

- Dynamic — reads wow/ files at runtime, no manual sync
- Context-aware — only loads relevant rules per trigger
- Scalable — works with inheritance when resolver is built

---

## Integration Maturity Model

```
Level 1: copilot-instructions.md     → Day 1 (manual, static)
Level 2: GitHub Action on PRs        → Week 2-3 (automated, visible)
Level 3: Copilot custom skills       → Week 4+ (dynamic, context-aware)
```

Each level builds on the previous. Start at Level 1 today — it takes 10 minutes and immediately makes your AI assistant aware of your team's norms.

---

## Next Steps

1. Copy the Level 1 template above into your repo's `.github/copilot-instructions.md`
2. Replace the example rules with your actual `wow/` file contents
3. Open a PR and observe Copilot referencing your team norms
4. When ready, add the Level 2 GitHub Action for visible enforcement
