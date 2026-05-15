# Roadmap

> Ways of Working as Code — "Team agreements as code. Human-readable. Agent-enforceable."

---

## v1 — Foundation (current)

**Goal:** Prove the concept. Codify enforceable team agreements that AI agents can read and act on.

### Scope
- **Content types:** Code review norms, Definition of Done/Ready, architecture principles, agent instructions
- **Enforcement levels:** hard, soft, info
- **Hierarchy:** Company → Unit → Team (inheritance + merge)
- **Triggers:** pr, commit, code-generation, onboarding
- **Tooling:** TypeScript CLI (`wow init`, `wow validate`, `wow show`) + GitHub Action
- **Agent integration:** Copilot custom instructions → GitHub Action checklist → Copilot skills (layered)
- **Format:** Structured markdown with YAML frontmatter + config.yaml manifest

### Deliverables
- [ ] Spec (schema, directory convention, inheritance model, enforcement levels, config.yaml)
- [ ] Examples (company → unit → team hierarchy with resolved view)
- [ ] CLI (init, validate, show)
- [ ] GitHub Action (PR compliance comment)

---

## v2 — Soft Norms + Expanded Triggers

**Goal:** Extend beyond machine-enforceable rules into team culture and rituals. Make wow/ the single source of truth for "how we work."

### New content types
| Category | Examples |
|----------|----------|
| Communication | Async-first policy, Slack thread norms, response time expectations |
| Meetings | Standup format, retro cadence, meeting-free days |
| Onboarding | 30/60/90 day plans, buddy system, first PR expectations |
| Incidents | Runbook templates, severity definitions, post-mortem format |
| Decisions | ADR templates, RACI matrices, escalation paths |

### New triggers
| Trigger | When |
|---------|------|
| `design-doc` | Design document created or reviewed |
| `incident` | Incident response activated |
| `retro` | Retrospective context |
| `meeting` | Calendar/ritual context |
| Custom | Team-defined (extensible enum) |

### New tooling
- **`wow lint <context>`** — Evaluate a PR diff against applicable rules, report pass/fail
- **VS Code extension** — Surface relevant wow/ rules in-editor based on current file/task
- **Slack/Chat bot** — Query interface ("what's our DoD?" → bot surfaces the rule)
- **Push-based compilation** — Pre-compile wow/ into optimized agent skill files for large orgs
- **Staleness detection** — Warn when `last_reviewed` exceeds configurable threshold (default: 90 days)

### Framework features
- **Multiple inheritance** — A team can inherit from more than one source (e.g., unit-level AND product-level). Enables cross-cutting concerns like a product Definition of Done that applies alongside the unit's engineering standards. Merge order is defined in `config.yaml`:
  ```yaml
  inherits_from:
    - url: "https://github.com/org/unit-platform/wow"
      ref: "v1.0"
    - url: "https://github.com/org/product-payments/wow"
      ref: "v2.0"
  ```
  Conflict resolution: files from later sources override earlier ones (last-wins), except `enforcement: hard` rules which are always locked regardless of source.
- Template library (starter wow/ files for common team archetypes)
- Migration tooling (import from Confluence, Notion, wiki → wow/ format)

---

## v3 — Observability + Intelligence

**Goal:** Measure the impact of WoW rules. Surface insights about team health and agreement drift.

### Metrics & dashboard
- Which rules trigger most often?
- Which rules get overridden by lower levels? (signals misalignment)
- Which rules are never triggered? (signals dead weight)
- Team compliance trends over time

### Intelligence
- **Auto-suggest rules** — Based on PR patterns, suggest new wow/ files ("You always request perf review for DB changes — codify this?")
- **Drift detection** — Alert when team behavior diverges from stated rules
- **Cross-team benchmarking** — "Teams with a DoD file merge 20% faster" (anonymized)

### Distribution
- **Package registry** — Publish wow/ bundles as versioned packages (npm/GitHub Packages)
- **Central governance dashboard** — Company-wide view of all teams' wow/ adoption
- **Audit log** — Track who changed which rules and when (beyond git history)

---

## v4 — Ecosystem & Community

**Goal:** Make wow-as-code a standard adopted beyond a single company.

### Community
- Open-source template gallery (community-contributed wow/ files)
- Integration plugins for GitLab, Azure DevOps, Bitbucket
- Conference talks, workshops, certifications
- Governance-as-Code partnerships (compliance frameworks mapped to wow/ files)

### Enterprise
- SSO/RBAC for rule authoring (who can set `hard` rules?)
- Multi-repo inheritance (monorepo vs. polyrepo support)
- Regulatory mapping (ISO 27001, SOC2 → corresponding wow/ rules)

---

## Principles guiding this roadmap

1. **Each version must stand alone.** v1 is useful without v2.
2. **Complexity is opt-in.** A team can adopt with a flat folder and 3 files.
3. **Agents are first-class citizens.** Every feature considers "how does an agent consume this?"
4. **Human-readable always.** If a human can't read it in a text editor, it doesn't belong in wow/.
