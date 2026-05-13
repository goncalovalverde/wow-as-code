---
id: security-review
title: Security Review Requirements
category: quality
enforcement: hard
owner: @security-team
applies_to: [pr, commit]
last_reviewed: 2026-04-01
tags: [security, compliance]
---

## Rule

All pull requests that modify authentication, authorization, or data handling code MUST include a security review approval from a member of @security-team.

## Rationale

Security vulnerabilities are the highest-cost defects. Proactive review prevents incidents.

## Exceptions

None. This rule cannot be relaxed by any unit or team.
