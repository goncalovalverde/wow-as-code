---
id: sprint-health
title: Sprint Health Indicators
category: delivery
enforcement: soft
owner: "@checkout-lead"
applies_to: [retrospective]
last_reviewed: 2026-05-20
tags: [retro, metrics, continuous-improvement]
---

## Metrics to Review

At each sprint retrospective, review these indicators against team targets:

### Delivery

- [ ] Sprint goal achieved (Y/N)
- [ ] Carry-over stories ≤ 2
- [ ] No stories blocked for > 2 days without escalation

### Quality

- [ ] Definition of Done met on ≥ 80% of stories
- [ ] Zero production incidents caused by sprint work
- [ ] Code review turnaround < 24h average

### Collaboration

- [ ] All PRs received ≥ 2 reviews
- [ ] Knowledge sharing session held (mob/pair/tech talk)
- [ ] Retro actions from last sprint are closed or in progress

## Rationale

Retrospectives are more effective when grounded in data. These indicators give the team concrete talking points rather than relying on feelings alone.

## How This Is Used

The retrospective automation (`.github/workflows/retrospective.yml`) analyzes merged PRs against these indicators and generates a compliance report before each retro meeting.
