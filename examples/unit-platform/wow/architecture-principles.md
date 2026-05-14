---
id: architecture-principles
title: Platform Architecture Principles
category: architecture
enforcement: soft
owner: "@platform-lead"
applies_to: [pr, code-generation]
last_reviewed: 2026-05-01
tags: [architecture, platform]
---

## Principles

1. **No direct database access from services.** All data access goes through the data access layer.
2. **Prefer async communication** between services via message queues.
3. **All public APIs must be versioned** using URL path versioning (e.g., `/v1/resource`).

## Rationale

These principles ensure platform stability and allow independent team deployments.
