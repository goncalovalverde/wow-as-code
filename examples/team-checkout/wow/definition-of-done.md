---
id: definition-of-done
title: Definition of Done
category: quality
enforcement: soft
owner: "@checkout-lead"
applies_to: [pr]
last_reviewed: 2026-05-10
tags: [quality-gate, delivery]
---

## Checklist

- [ ] Code compiles and passes all existing tests
- [ ] New code has unit tests (≥80% coverage for new lines)
- [ ] API changes are documented in OpenAPI spec
- [ ] No new lint warnings introduced
- [ ] PR description explains the "why", not just the "what"
- [ ] Relevant monitoring/alerting updated if applicable

## Rationale

A shared DoD prevents "it works on my machine" and ensures consistent quality.
