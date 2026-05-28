# config.yaml Specification

> Part of the [wow-as-code](../README.md) specification.

## Overview

Every `wow/` directory MUST contain a `config.yaml` file. It serves two purposes:

1. **Inheritance declaration** — where this level inherits rules from.
2. **File manifest** — index of all WoW files with metadata for agent fast-path loading.

## Schema

```yaml
# wow/config.yaml

wow_version: "1.0"

# Inheritance chain (optional — omit for company/root level)
inherits_from:
  - url: "https://github.com/org/company-wow/wow"
    ref: "v1.0"                    # tag (recommended) or branch

# File manifest (required)
files:
  - id: code-review
    path: quality/code-review.md   # or just code-review.md if flat
    applies_to: [pr]
    enforcement: soft
  - id: security-review
    path: quality/security-review.md
    applies_to: [pr, commit]
    enforcement: hard
  - id: architecture-principles
    path: architecture/principles.md
    applies_to: [pr, code-generation]
    enforcement: soft
```

## Fields

### Top-level

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `wow_version` | string | Yes | Spec version this config follows. Currently `"1.0"`. |
| `inherits_from` | array | No | Parent level(s) to inherit rules from. |
| `files` | array | Yes | Manifest of all WoW files in this directory. |

### `inherits_from[]`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Git URL to the parent's `wow/` directory. |
| `ref` | string | Yes | Git ref (tag or branch). Tags recommended for stability. |

### `files[]`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Must match the `id` in the file's frontmatter. |
| `path` | string | Yes | Relative path from `wow/` to the file. |
| `applies_to` | array | Yes | Copied from frontmatter. Enables agent filtering without opening the file. |
| `enforcement` | string | Yes | Copied from frontmatter. Enables priority sorting without opening the file. |

## Agent Usage

Agents consume `config.yaml` as follows:

1. Read `config.yaml` (single file read).
2. Filter `files[]` by current trigger context (e.g., `applies_to` includes `pr`).
3. Load only the matching files (typically 3-5, not all).
4. If `inherits_from` is present, resolve parent chain and merge.

This ensures agents load minimal context — solving the "30+ files in context window" problem.

## Validation Rules

The CLI `wow validate` enforces:

1. Every file in `wow/` (excluding `config.yaml`) MUST be listed in the manifest.
2. Manifest `id`, `applies_to`, and `enforcement` MUST match the file's frontmatter.
3. Manifest `path` MUST resolve to an existing file.
4. `inherits_from` URLs MUST be reachable (warning if offline).
5. No duplicate `id` values within the same manifest.

## Auto-generation

The CLI `wow init` generates `config.yaml` automatically by scanning existing `wow/` files and extracting frontmatter. Teams don't need to maintain this file manually — run `wow validate --fix` to regenerate it from source files.

## External Source (Private WoW)

When `wow/` cannot live in the target repository (e.g., shared repos, client-owned codebases), rules are loaded from an external private source at runtime.

Supported mechanisms:

1. **Cross-repo checkout** — GitHub Action checks out the private WoW repo during CI
2. **Environment variable** — `WOW_SOURCE` URL + `WOW_TOKEN` for authentication
3. **Published package** — WoW rules as a versioned npm/artifact package
4. **CLI flag** — `wow validate --source <url> --token <token>`

The `inherits_from` URLs support private repositories when authentication is available in the environment (`GH_TOKEN`, `WOW_TOKEN`, or GitHub App credentials).

See [Private WoW Source guide](../docs/private-wow-source.md) for implementation patterns.
