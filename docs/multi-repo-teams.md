# Multi-Repo Teams

> How to manage ways of working when one team owns multiple repositories and products.

---

## The Problem

A team often works across several repositories:

- A backend API, a frontend app, a BFF, a shared library
- Multiple microservices
- A mix of languages and frameworks

Without a strategy, you end up with:

- Duplicated `wow/` directories across repos (drift risk)
- Inconsistent enforcement (some repos have rules, others don't)
- Maintenance burden (update one rule → update 5 repos)

---

## Solution: Central Team WoW Repo

Keep a **single source of truth** for your team's agreements in a dedicated private repository. All product repos inherit from it.

```
┌─────────────────────────────────────────────────────────┐
│           ctw-internal/team-checkout-wow                 │
│                                                         │
│  wow/                                                   │
│    config.yaml                                          │
│    code-review.md          ← applies to all repos       │
│    definition-of-done.md   ← applies to all repos       │
│    architecture-principles.md                           │
│    onboarding-checklist.md                              │
│    sprint-health.md                                     │
│                                                         │
│  inherits_from: ctw-internal/unit-platform-wow          │
└─────────────────────────────────────────────────────────┘
          ↓                ↓                ↓
   checkout-api/    checkout-frontend/   payments-service/
```

**Benefits:**

- Update a rule once → all repos pick it up automatically
- New repos get full compliance immediately (add the workflow, done)
- Team sees their norms in one place
- Inheritance still works (company → unit → team → repo)

---

## Setup

### Step 1: Create the team WoW repo

```bash
# ctw-internal/team-checkout-wow
mkdir -p wow
wow init  # generates config.yaml + starter files
```

```yaml
# wow/config.yaml
wow_version: "1.0"

inherits_from:
  - url: "https://github.com/ctw-internal/unit-platform-wow/wow"
    ref: "v1.0"

files:
  - id: code-review
    path: code-review.md
    applies_to: [pr]
    enforcement: soft
  - id: definition-of-done
    path: definition-of-done.md
    applies_to: [pr, planning]
    enforcement: soft
  - id: architecture-principles
    path: architecture-principles.md
    applies_to: [pr, code-generation]
    enforcement: soft
  - id: onboarding-checklist
    path: onboarding-checklist.md
    applies_to: [onboarding]
    enforcement: info
  - id: sprint-health
    path: sprint-health.md
    applies_to: [retrospective]
    enforcement: soft
```

### Step 2: Add the workflow to each product repo

Copy a standard workflow that reads from the team WoW repo:

```yaml
# .github/workflows/wow-check.yml (in each product repo)
name: WoW Compliance Check

on:
  pull_request:
    types: [opened, synchronize, ready_for_review]

jobs:
  wow-check:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - name: Checkout team WoW rules
        uses: actions/checkout@v4
        with:
          repository: ctw-internal/team-checkout-wow
          token: ${{ secrets.WOW_READ_TOKEN }}
          path: .wow-rules
          ref: v1.0  # pin to a tag for stability

      - name: Run compliance check
        run: |
          # Use .wow-rules/wow/ as the WoW source
          # ... (same logic as standard wow-check)
```

### Step 3: Pin with tags (recommended)

Tag releases in your team WoW repo:

```bash
git tag v1.0 && git push --tags
git tag v1.1 && git push --tags  # after rule updates
```

Product repos pin to a tag. Upgrade deliberately:

```yaml
ref: v1.0  # stable — won't change unexpectedly
# ref: main  # living — always latest (riskier)
```

---

## Adding Repo-Specific Rules

Some repos need additional rules that don't apply to others. Use **layered inheritance**:

```yaml
# checkout-frontend/wow/config.yaml
wow_version: "1.0"

inherits_from:
  - url: "https://github.com/ctw-internal/team-checkout-wow/wow"
    ref: "v1.0"

# Repo-specific additions
files:
  - id: accessibility
    path: accessibility.md
    applies_to: [pr]
    enforcement: soft
  - id: bundle-size
    path: bundle-size.md
    applies_to: [pr, deploy]
    enforcement: hard
```

**Result:** This repo gets all team rules PLUS `accessibility` and `bundle-size`.

```
Team rules (inherited):          Repo-specific (local):
  ✓ code-review                    ✓ accessibility
  ✓ definition-of-done             ✓ bundle-size
  ✓ architecture-principles
```

---

## Repo Without Local wow/ Directory

If a product repo has **no local `wow/` directory** (e.g., it's a client-owned repo), the workflow still works — it just reads directly from the team WoW repo:

```yaml
# No wow/ in this repo — all rules come from team WoW repo
- name: Checkout team WoW rules
  uses: actions/checkout@v4
  with:
    repository: ctw-internal/team-checkout-wow
    token: ${{ secrets.WOW_READ_TOKEN }}
    path: .wow-rules
```

See [Private WoW Source](./private-wow-source.md) for details on this pattern.

---

## Full Hierarchy Example

```
ctw-internal/company-wow              ← org-wide
│  security-review.md (hard)
│  data-handling.md (hard)
│
├── ctw-internal/unit-platform-wow    ← unit level
│   │  architecture-principles.md (soft)
│   │  api-standards.md (soft)
│   │
│   ├── ctw-internal/team-checkout-wow  ← team level
│   │       code-review.md (soft)
│   │       definition-of-done.md (soft)
│   │       onboarding-checklist.md (info)
│   │       sprint-health.md (soft)
│   │           │           │           │
│   │     checkout-api  checkout-fe  payments-svc
│   │     (inherits)    (inherits    (inherits)
│   │                   + a11y)
│   │
│   └── ctw-internal/team-payments-wow  ← another team
│           pci-compliance.md (hard)
│           ...
```

Each product repo resolves the full chain: company → unit → team → repo-specific.

---

## Automation: Onboarding New Repos

When the team creates a new product repo, they need to add the workflow. Automate this with a template:

```bash
# Team repo template includes:
.github/
  workflows/
    wow-check.yml         # pre-configured with team WoW repo
  copilot-instructions.md # flattened team rules for Copilot
```

Or use a GitHub repository template that includes the workflow pre-configured.

---

## Updating Rules Across All Repos

When you update a team rule:

| Strategy | How | When |
|----------|-----|------|
| **Tag-based (recommended)** | Update WoW repo → tag new version → repos update `ref` at their pace | Breaking changes, enforcement level changes |
| **Branch-based (living)** | Repos point to `ref: main` → pick up changes immediately | Non-breaking additions, wording tweaks |
| **Automated PR** | Bot opens PRs in product repos bumping the tag | Controlled rollout with visibility |

### Automated tag bump (optional)

```yaml
# In team WoW repo: .github/workflows/notify-repos.yml
name: Notify product repos of WoW update
on:
  push:
    tags: ['v*']
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Open PRs in product repos
        run: |
          for repo in checkout-api checkout-frontend payments-service; do
            gh pr create --repo "ctw-internal/$repo" \
              --title "chore: bump WoW rules to ${{ github.ref_name }}" \
              --body "Team WoW rules updated. Review and merge to adopt."
          done
```

---

## Best Practices

1. **One team, one WoW repo** — even if you have 10 product repos
2. **Tag releases** — don't force changes on product repos without notice
3. **Keep repo-specific rules minimal** — if most repos need it, put it in the team WoW repo
4. **Use `ref: main` for development, tags for production repos**
5. **Template new repos** — include the workflow from day one
6. **Review WoW repo in retros** — "do these rules still serve us?"

---

## Related

- [Private WoW Source](./private-wow-source.md) — when you can't put `wow/` in the product repo
- [Inheritance Model](../spec/inheritance-model.md) — how rules merge across levels
- [config.yaml Specification](../spec/config-yaml.md) — manifest and `inherits_from` reference
