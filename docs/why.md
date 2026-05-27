# Why wow-as-code?

> The problem this specification solves, and why existing approaches fail.

---

## The Status Quo

Every engineering team has working agreements. Definition of Done. Code review norms. Architecture principles. Security requirements.

**Where do they live today?**

- A Confluence page last edited 14 months ago
- A slide deck from an offsite nobody can find
- The tech lead's head
- A README section that's 3 versions behind

**What happens?**

1. New joiners discover norms 3 months in — by violating them
2. AI agents generate code with zero awareness of your team's preferences
3. Norms erode silently — no one notices until a production incident
4. "We agreed on this" becomes tribal knowledge that leaves when people leave
5. Different teams in the same org have contradictory practices with no resolution mechanism

---

## Why Existing Approaches Fail

### Wiki pages (Confluence, Notion)

- ❌ Disconnected from where work happens (the IDE, the PR)
- ❌ No version control — who changed what, when?
- ❌ No enforcement — reading is optional, compliance is honor-system
- ❌ No hierarchy — company rules and team rules live in different spaces with no link

### Linters and CI rules

- ❌ Only cover syntax and formatting — not team process or architecture decisions
- ❌ Binary pass/fail — no room for "soft" recommendations
- ❌ Can't express "why" — just the "what"
- ❌ Require engineering effort for every rule change

### READMEs and CONTRIBUTING.md

- ❌ Monolithic — one file tries to cover everything
- ❌ No structure — can't be machine-parsed
- ❌ No inheritance — every repo repeats the same rules
- ❌ No trigger awareness — same content regardless of context

---

## What's Different About wow-as-code

| Property | Wiki | Linters | wow-as-code |
|----------|------|---------|-------------|
| Lives with the code | ❌ | ✅ | ✅ |
| Human-readable | ✅ | ❌ | ✅ |
| Machine-parseable | ❌ | ✅ | ✅ |
| Version controlled | ❌ | ✅ | ✅ |
| Hierarchical (company → team) | ❌ | ❌ | ✅ |
| Context-aware (triggers) | ❌ | Partial | ✅ |
| Enforcement levels (hard/soft/info) | ❌ | Binary | ✅ |
| AI agent compatible | ❌ | ❌ | ✅ |
| Expresses intent ("why") | ✅ | ❌ | ✅ |

---

## The Core Insight

**Team agreements should be:**

1. **Where the work happens** — in the repo, visible in PRs, loaded by agents
2. **Structured enough for machines** — YAML frontmatter, JSON Schema, manifest
3. **Readable enough for humans** — markdown body with rationale and examples
4. **Hierarchical** — company governance flows down, teams customize within bounds
5. **Context-aware** — different rules surface at different moments (PR, planning, code generation)

---

## Who Benefits

### Engineering Managers / Tech Leads

- Codify team norms once, enforce continuously
- New joiners get context automatically
- Retrospectives become data-driven ("DoD compliance was 75% this sprint")

### Individual Contributors

- Clear expectations — no guessing what "good" looks like
- AI assistants that respect team conventions
- Less back-and-forth in code reviews (rules are explicit)

### Platform / DevEx Teams

- Governance at scale — company standards flow down automatically
- `hard` enforcement for non-negotiable security/compliance requirements
- Measurable adoption and compliance rates

### AI Agents (Copilot, Cursor, etc.)

- Structured input they can parse and act on
- Trigger-based filtering (load only relevant rules per context)
- Clear enforcement semantics (must vs. should vs. reference)

---

## The Vision

```
Today:    Norms in wiki → ignored → eroded → incident → "we should document this"
Tomorrow: Norms in code → enforced → measured → improved → culture as code
```

A world where:
- Every PR shows a compliance checklist generated from living team agreements
- AI agents generate code that respects your architecture principles
- New joiners receive a personalized onboarding digest on day one
- Sprint retros include data on which norms were followed and which weren't
- Teams can customize within company guardrails — no more "that doesn't apply to us" without an explicit override

---

## Get Started

→ [Getting Started Guide](./getting-started.md)  
→ [Specification](../spec/)  
→ [Examples](../examples/)  
→ [Agent Integration](./agent-integration.md)
