# ADR-005: Methodology-neutral Workflows

- **Status:** Proposed
- **Date:** 2026-10-20
- **Decision makers:** @goncalovalverde

## Context

ADR-002 (decision 4) calls for workflow files that describe how work moves, independent of Scrum or Kanban, including humans and AI agents. Rules say *what is expected*; a workflow says *in what order, by whom, and what must hold before moving on*.

## Decision

1. **Separate artifact type.** Workflows live in `wow/workflows/*.md` and are listed in `config.yaml` under `workflows:` (`id`, `path`). They have their own schema (`spec/workflow-schema.json`) because phases are structured data, unlike rules.
2. **Shape.** Frontmatter `phases[]`, each with `id`, `name`, `performer` (`human` | `agent` | `both`), optional `inputs` / `outputs` (artifact names) and optional `gate` (`rules`: rule ids that must hold; `approval`: `human` | `none`). The markdown body explains the workflow in prose.
3. **Validation.** Schema validation plus semantic checks: unique phase ids, gate rule ids must resolve to a known rule, and a phase performed by `agent` that has a gate containing a `hard` rule must require `approval: human`, or a deterministic or human verifier on that rule. Artifact input/output names are free text; an input never produced by an earlier phase is only a warning (it may be external).
4. **Delivery.** `wow sync` appends a "Workflows" section to every compiled file; the MCP server gains `list_workflows` and `get_workflow`.
5. **Local only in this slice.** Workflows are not inherited through `inherits_from` yet; that needs a `SourceProvider` contract change and will follow with packs.
6. **Experimental.** Documented as experimental; fields may change before v2 is declared stable. `x-` fields are allowed.

Diagram: [`docs/diagrams/workflows.mmd`](../diagrams/workflows.mmd).

## Alternatives Considered

| Option | Rejected because |
|--------|-----------------|
| New rule category `workflow` | Rules are flat; phases/gates need structured fields and would pollute the rule schema |
| Free-form markdown only | Not machine-checkable; agents cannot query phases or gates |
| Inherit workflows now | Requires changing `SourceProvider`; adds risk before the shape is proven |

## Consequences

- Scrum, Kanban and spec-driven (spec → plan → tasks → implement → verify) are expressed as example workflows, not built-ins.
- Gates reference rule ids, tying workflows to verification (v1.2).
- Roles (autonomy levels) can later attach to phases without changing this schema.
