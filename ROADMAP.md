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

## v2 — Knowledge Codification + Expanded Triggers

**Goal:** Make `wow/` the single source of truth for "how we work" — not just machine-enforceable rules, but all team agreements in a structured, discoverable, agent-queryable format.

### Reframed value proposition

v1 focuses on enforcement (block, suggest, inform). v2 extends into **team knowledge** — agreements that may not have a CI hook today but benefit from being versioned, inherited, and surfaced by agents on demand.

### New content types

v1's four categories (`quality`, `architecture`, `delivery`, `collaboration`) remain fixed. New content types map into existing categories; use `tags` for fine-grained filtering.

| Content type | Category | Examples |
|-------------|----------|----------|
| Communication | `collaboration` | Async-first policy, Slack thread norms, response time expectations |
| Meetings | `collaboration` | Standup format, retro cadence, meeting-free days |
| Onboarding | `collaboration` | 30/60/90 day plans, buddy system, first PR expectations |
| Incidents | `delivery` | Runbook templates, severity definitions, post-mortem format |
| Decisions | `architecture` | ADR templates, RACI matrices, escalation paths |

### New triggers (promoted from reserved)

Triggers are split into two tiers based on whether an automated enforcement surface exists:

**Enforceable triggers** — have a hookable event (PR, CI, file detection):

| Trigger | When | Enforcement surface |
|---------|------|---------------------|
| `design-doc` | Design document created or reviewed | PR containing files matching a design doc path pattern |
| `review` | Non-PR review (e.g., architecture review board) | GitHub review event or label-based detection |

**Context triggers** — agent loads rules on demand, no automated enforcement:

| Trigger | When | Agent behavior |
|---------|------|----------------|
| `incident` | Incident response activated | Surface runbook norms; validate post-mortem artifacts if committed to repo |
| `retro` | Retrospective context | Surface retro format and norms on request |
| `meeting` | Meeting or ritual context | Surface meeting norms on request |

Custom triggers (`custom:*` prefix) remain available for team-defined contexts.

### Agent behavior model

Agents interact with wow/ rules in three layered modes:

| Mode | Description | When |
|------|-------------|------|
| **Surface** | Present relevant rules as context | Default for context triggers and `info` rules |
| **Validate** | Check an artifact against rules, report pass/fail | Default for enforceable triggers and `hard`/`soft` rules with an artifact |
| **Generate** | Use rules as templates to produce artifacts | Stretch goal — e.g., generate a pre-filled post-mortem from `wow/incident.md` |

Agent behavior is **inferred** from trigger type + enforcement level by default. Files can explicitly override with the optional `agent_behavior` frontmatter field (`surface`, `validate`, or `generate`).

### Schema changes

| Field | Type | Required | Purpose |
|-------|------|----------|---------|
| `applies_to` | enum (expanded) | Yes | Add `design-doc`, `incident`, `retro`, `meeting`, `review` to core enum |
| `agent_behavior` | enum: `surface`, `validate`, `generate` | No | Override inferred agent behavior. Omit to let agents infer from trigger + enforcement. |
| `max_review_age` | integer (days) | No | Per-file staleness threshold override |

Version compatibility: `wow_version` remains informational, not a gate. v2 tooling reads v1 files (they are a subset). v1 tooling ignores unknown fields and triggers (forward-compatible, per existing spec).

### New tooling

- **`wow lint`** — Context-aware local linter:
  - `wow lint` — lint current diff against `pr` rules (local mirror of CI)
  - `wow lint --context <trigger> <file>` — validate any artifact against any trigger's rules (e.g., `wow lint --context incident postmortem.md`)
- **`wow compile`** — Pre-compile wow/ into agent-consumable formats:
  - `--target resolved` — flat snapshot of all resolved rules with provenance (extends `wow show`)
  - `--target copilot-instructions` — generates `.github/copilot-instructions.md` from wow/ rules
- **Staleness detection** — Warn when `last_reviewed` exceeds threshold:
  - Global default in `config.yaml`: `staleness_threshold_days: 90`
  - Per-file override via `max_review_age` in frontmatter
  - `hard` + stale → `wow validate` **warns** (does not fail — avoids CI breakage for still-valid rules)
  - `soft`/`info` + stale → informational note only

### Framework features

- **Multiple inheritance** — A team can inherit from more than one source. Merge order is defined by list order in `config.yaml` (order-only, no per-rule pinning):
  ```yaml
  inherits_from:
    - url: "https://github.com/org/unit-platform/wow"
      ref: "v1.0"
    - url: "https://github.com/org/product-payments/wow"
      ref: "v2.0"
  ```
  Conflict resolution:
  - `hard` rules: if two parents define the same `id` with `enforcement: hard` and conflicting values, `wow validate` **fails** — humans must resolve organizational conflicts explicitly.
  - `soft`/`info` rules: last-wins (later source overrides earlier).

---

## v3 — Reach + Observability

**Goal:** Expand distribution channels, add observability, and measure the impact of WoW rules.

### Distribution channels (deferred from v2)
- **VS Code extension** — Surface relevant wow/ rules in-editor based on current file/task
- **Slack/Chat bot** — Query interface ("what's our DoD?" → bot surfaces the rule)
- **`wow compile` additional targets** — `--target skill`, `--target system-prompt`
- **Per-rule pinning** for multiple inheritance (`include`/`exclude` filters per parent source)

### Migration tooling (deferred from v2)
- **`wow import <markdown-file>`** — Wrap plain markdown with frontmatter scaffolding
- **Manual migration guide** — Step-by-step doc for converting wiki-based agreements to wow/ format
- **Platform importers** — Confluence, Notion, wiki API integrations (stretch)

### Template library (deferred from v2)
- Starter wow/ files for common team archetypes (backend API, frontend, platform, data/ML, startup)
- Bundled in spec repo initially, separate community repo when contributions grow

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
