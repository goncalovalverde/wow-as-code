# Private WoW Source

> How to enforce team agreements on shared repositories without exposing your rules.

---

## The Problem

Many teams work in repositories they don't fully own:

- A vendor team working in a client's codebase
- Multiple organizational units sharing a monorepo
- Teams contributing to open-source repos with private process norms

In these scenarios, putting `wow/` directly in the shared repo is not viable:

- Rules may contain internal team context not meant for external visibility
- IP or contractual constraints prevent publishing process documentation
- Different teams in the same repo may have different (conflicting) norms

---

## Solution: External WoW Source

The WoW rules live in a **private repository** owned by the team. Enforcement happens in the shared repo via cross-repo access at CI time.

```
┌──────────────────────────────┐       ┌──────────────────────────────┐
│  Shared Repo (client-owned)  │       │  Private Repo (team-owned)   │
│                              │       │                              │
│  .github/                    │       │  wow/                        │
│    workflows/wow-check.yml ──┼─reads─┤    config.yaml               │
│    copilot-instructions.md   │       │    code-review.md            │
│                              │       │    definition-of-done.md     │
│  src/                        │       │    security-review.md        │
│  (no wow/ directory)         │       │                              │
└──────────────────────────────┘       └──────────────────────────────┘
```

---

## Implementation Patterns

### Pattern 1: GitHub Action with cross-repo checkout (recommended)

The shared repo has a workflow that checks out WoW rules from the private repo at runtime.

```yaml
# .github/workflows/wow-check.yml (in the shared repo)
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

      - name: Checkout team WoW rules (private)
        uses: actions/checkout@v4
        with:
          repository: my-org/team-wow        # private repo
          token: ${{ secrets.WOW_READ_TOKEN }}
          path: .wow-rules
          ref: main

      - name: Run compliance check
        run: |
          # Point the check at the external rules
          WOW_DIR=".wow-rules/wow"
          CONFIG="$WOW_DIR/config.yaml"
          # ... same logic as standard wow-check workflow
```

**Setup:**
1. Create a fine-grained personal access token (or GitHub App) with read access to the private WoW repo
2. Add it as a secret (`WOW_READ_TOKEN`) in the shared repo
3. The workflow checks out rules at runtime — they never persist in the shared repo

---

### Pattern 2: Copilot Instructions (flattened, no source link)

For AI agent awareness without exposing the source, flatten key rules into `.github/copilot-instructions.md` in the shared repo:

```markdown
# Copilot Instructions

## Team Agreements

When generating code or reviewing PRs in this repository, follow these rules:

### Code Review (enforcement: soft)
- All PRs require at least 2 approvals before merge
- Performance-sensitive changes require performance team review

### Security (enforcement: hard)
- PRs modifying auth code MUST have security review
- Never bypass this requirement
```

**Key point:** This file contains the *rules* but not their source, inheritance chain, or internal context. It's a projection, not a reference.

**Keeping it in sync:** Use a scheduled GitHub Action that regenerates `copilot-instructions.md` from the private WoW source:

```yaml
# Runs weekly in the shared repo
- name: Sync copilot instructions from WoW source
  run: |
    wow show --trigger code-generation --format copilot-instructions \
      --config .wow-rules/wow/config.yaml > .github/copilot-instructions.md
```

---

### Pattern 3: Environment variable source

For CI pipelines that can't do cross-repo checkout, the WoW source can be specified via environment variable:

```yaml
env:
  WOW_SOURCE: "https://github.com/my-org/team-wow/wow"
  WOW_TOKEN: ${{ secrets.WOW_READ_TOKEN }}
```

The agent or CLI resolves this URL at runtime:

```bash
wow validate --source "$WOW_SOURCE" --token "$WOW_TOKEN"
```

---

### Pattern 4: Published package (npm / artifact)

For maximum decoupling, publish WoW rules as a versioned package:

```bash
# In the private WoW repo
npm publish --registry https://npm.pkg.github.com

# In the shared repo's CI
npm install @my-org/team-wow --registry https://npm.pkg.github.com
wow validate --config node_modules/@my-org/team-wow/wow/config.yaml
```

**Benefits:**
- Versioned (pin to `^1.0.0` for stability)
- Standard package management (no special tokens in workflows)
- Works with any CI system

---

## Inheritance with Private Sources

The `inherits_from` field already supports private URLs. The resolver needs authentication:

```yaml
# Private team wow/config.yaml
wow_version: "1.0"

inherits_from:
  - url: "https://github.com/my-org/company-wow/wow"
    ref: "v1.0"
    # Authentication handled by environment (GH_TOKEN, WOW_TOKEN, etc.)
```

The hierarchy still works:

```
Company WoW (private)         ← org-wide rules
    ↓ inherits_from
Unit WoW (private)            ← business unit rules
    ↓ inherits_from
Team WoW (private)            ← team-specific rules
    ↓ enforced on
Shared Repo (client-owned)    ← no wow/ directory here
```

---

## Security Considerations

| Concern | Mitigation |
|---------|-----------|
| Token exposure | Use fine-grained tokens with read-only access to WoW repo only |
| Rule content in logs | Avoid printing full rule content in CI output |
| Copilot instructions leak rules | Only flatten what's acceptable for the shared repo's audience |
| Token in workflow file | Use GitHub Secrets, never hardcode |
| Stale rules | Pin to tags (`ref: v1.2.0`) or use scheduled sync |

---

## When to Use Each Pattern

| Scenario | Recommended Pattern |
|----------|-------------------|
| Team works in client's GitHub repo | Pattern 1 (cross-repo checkout) |
| AI agent needs awareness, no CI access | Pattern 2 (flattened instructions) |
| Multi-CI environment (Jenkins, GitLab, etc.) | Pattern 3 (env variable) or Pattern 4 (package) |
| Strict versioning requirements | Pattern 4 (published package) |
| Quick start, minimal setup | Pattern 2 (flattened instructions) |

---

## Example: Full Setup for a Vendor Team

A team at "Acme Corp" working in "Client Inc's" monorepo:

```
# Acme Corp private GitHub org
acme/engineering-wow/          ← company-wide rules
acme/team-alpha-wow/           ← team-alpha specific rules (inherits from above)

# Client Inc shared repo
client-inc/platform/           ← shared monorepo
  .github/
    workflows/wow-check.yml    ← checks out acme/team-alpha-wow at runtime
    copilot-instructions.md    ← flattened rules (synced weekly)
```

**Result:**
- ✅ Rules are private to Acme Corp
- ✅ Enforcement happens on every PR in the shared repo
- ✅ AI agents get context via copilot-instructions.md
- ✅ Client never sees the internal team documentation
- ✅ Inheritance still works (company → team)

---

## Related

- [config.yaml Specification](../spec/config-yaml.md) — manifest and `inherits_from` reference
- [Agent Integration Guide](./agent-integration.md) — how agents consume WoW files
- [Directory Convention](../spec/directory-convention.md) — standard `wow/` structure
