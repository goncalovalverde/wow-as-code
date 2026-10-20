---
id: security-review
title: Security Review Requirements
category: quality
enforcement: hard
owner: "@security-team"
applies_to: [pr, commit]
last_reviewed: 2026-04-01
review_by: 2027-04-01
verify:
  type: human
  instructions: A member of @security-team approves the PR when auth, authorization or data-handling code changes.
rationale: Security vulnerabilities are the highest-cost defects; proactive review prevents incidents.
tags: [security, compliance]
---

## Rule

All pull requests that modify authentication, authorization, or data handling code MUST include a security review approval from a member of @security-team.

## Rationale

Security vulnerabilities are the highest-cost defects. Proactive review prevents incidents.

## Exceptions

None. This rule cannot be relaxed by any unit or team.
