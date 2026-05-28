# wow-as-code

[![Spec Version](https://img.shields.io/badge/spec-v1.0-blue)](spec/)
[![License: Apache 2.0](https://img.shields.io/badge/code-Apache%202.0-orange)](LICENSE)
[![License: CC BY 4.0](https://img.shields.io/badge/docs-CC%20BY%204.0-lightgrey)](LICENSE-DOCS)
[![Triggers](https://img.shields.io/badge/triggers-7%20core-green)](spec/triggers.md)

**Team agreements as code. Human-readable. Agent-enforceable.**

> 📖 [Why wow-as-code?](docs/why.md) · 🚀 [Getting Started](docs/getting-started.md) · 🤖 [Agent Integration](docs/agent-integration.md)

---

## What is this?

A specification for codifying team ways of working in structured markdown files that:

- **Humans** can read, edit, and discover in any text editor or GitHub UI
- **AI agents** can consume and enforce at PR time, during code generation, and onboarding
- **Organizations** can govern through hierarchy (company → unit → team) with inheritance and override controls

## The Problem

Your team's working agreements live in a Confluence page nobody reads. New joiners discover them 3 months in. AI agents have zero awareness they exist. When norms aren't codified where the work happens, they erode.

## The Solution

A `wow/` directory — in a **dedicated team repo** (recommended) or alongside your code:

```
your-org/team-wow/               # Private repo — single source of truth
  wow/
  ├── config.yaml                # Manifest + inheritance config
  ├── code-review.md             # enforcement: soft
  ├── security-review.md         # enforcement: hard (can't be relaxed)
  └── definition-of-done.md      # enforcement: soft
```

Your product repos read from it via CI — rules stay private, enforcement is automatic.

Each file is structured markdown with YAML frontmatter:

```yaml
---
id: code-review
title: Code Review Norms
category: quality
enforcement: soft
owner: @tech-lead
applies_to: [pr]
last_reviewed: 2026-05-01
tags: [quality-gate]
---
```

## Key Features

### Enforcement Levels
- **`hard`** — Agent blocks/warns. CI fails. Cannot be relaxed by lower levels.
- **`soft`** — Agent suggests. Teams can override.
- **`info`** — Reference only. Surfaced on request.

### Organizational Hierarchy
```
Company wow/ → Unit wow/ → Team wow/
```
- Rules inherit downward with field-level merge
- `hard` rules are governance-locked (security/compliance teams retain control)
- Teams have full autonomy over `soft` and `info` rules

### Agent-First Design
- `config.yaml` manifest enables agents to load only relevant files (3-5, not 30+)
- `applies_to` filtering: agents load rules matching the current trigger (pr, commit, code-generation, onboarding)
- Provenance tracking: resolved views show which level each rule came from

## Specification

- [Directory Convention](spec/directory-convention.md)
- [Frontmatter Schema](spec/schema.json)
- [Inheritance Model](spec/inheritance-model.md)
- [Enforcement Levels](spec/enforcement-levels.md)
- [Triggers](spec/triggers.md)
- [config.yaml Specification](spec/config-yaml.md)

## Examples

See [`examples/`](examples/) for a complete hierarchy demonstration:
- [Company level](examples/company/wow/) — global baseline rules
- [Unit level](examples/unit-platform/wow/) — unit-specific overrides
- [Team level](examples/team-checkout/wow/) — team additions and overrides
- [Resolved view](examples/resolved/team-checkout/) — what the agent actually sees after merge

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full v1 → v4 vision.

## License

- Specification & documentation: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Code (schemas, tooling): [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get involved.
