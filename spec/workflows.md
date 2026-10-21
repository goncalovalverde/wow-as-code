# Workflows (experimental)

A **workflow** describes how work moves: ordered phases, who performs each (human, agent, or both), the artifacts passed between them, and the gate that must hold before moving on. It is methodology-neutral: Scrum, Kanban and spec-driven delivery are all just example workflows. See [ADR-005](../docs/adr/005-methodology-neutral-workflows.md).

## Location

`wow/workflows/<id>.md`, listed in `config.yaml`:

```yaml
workflows:
  - id: spec-driven
    path: workflows/spec-driven.md
```

Workflows are local to a repo for now; they are not inherited via `inherits_from`.

## Frontmatter

Schema: [`workflow-schema.json`](workflow-schema.json).

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | kebab-case; must match `config.yaml` |
| `title` | yes | Human-readable name |
| `owner` | yes | Who maintains it |
| `description` | no | One-line summary |
| `phases` | yes | Ordered list (at least one) |

Each phase:

| Field | Required | Description |
|-------|----------|-------------|
| `id`, `name` | yes | `id` is kebab-case and unique within the workflow |
| `performer` | yes | `human`, `agent` or `both` |
| `inputs` / `outputs` | no | Artifact names (free text) |
| `gate.rules` | no | Rule ids that must hold to leave the phase |
| `gate.approval` | no | `human` or `none` |

`x-` prefixed fields are allowed at workflow and phase level.

## Validation (`wow validate`)

1. Schema validation.
2. Phase ids are unique.
3. Every `gate.rules` id resolves to a known rule (including inherited ones).
4. A phase performed by an `agent` and gated by a `hard` rule needs `gate.approval: human`, unless that rule has a deterministic or human [verifier](verification.md).
5. Warning only: an input that no earlier phase produces (it may be external).

## Delivery

- `wow sync` appends a **Workflows** section to every compiled file (`AGENTS.md`, `CLAUDE.md`, ...).
- `wow show --workflows` prints them (`--format json` for machine output).
- `wow mcp` exposes `list_workflows` and `get_workflow`.

## Example

See [`examples/team-checkout/wow/workflows/`](../examples/team-checkout/wow/workflows/).
