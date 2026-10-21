---
id: spec-driven
title: Spec-driven delivery
owner: "@team-checkout"
description: Humans decide what and why; agents implement; every phase ends at a gate.
phases:
  - id: specify
    name: Specify
    performer: both
    inputs: [request]
    outputs: [spec]
    gate: { approval: human }
  - id: plan
    name: Plan and break into tasks
    performer: agent
    inputs: [spec]
    outputs: [tasks]
    gate: { approval: human }
  - id: implement
    name: Implement
    performer: agent
    inputs: [tasks]
    outputs: [pull-request]
    gate: { rules: [code-review] }
  - id: verify
    name: Verify and merge
    performer: human
    inputs: [pull-request]
    outputs: [release]
    gate: { rules: [definition-of-done], approval: human }
---

# Spec-driven delivery

A methodology-neutral flow: it works with sprints, Kanban or neither. Agents never move past
Specify or Plan without a human approval.
