---
id: kanban-flow
title: Kanban flow
owner: "@team-checkout"
phases:
  - id: backlog
    name: Backlog refinement
    performer: human
    outputs: [ready-item]
  - id: doing
    name: In progress
    performer: both
    inputs: [ready-item]
    outputs: [pull-request]
    gate: { rules: [code-review] }
  - id: done
    name: Done
    performer: human
    inputs: [pull-request]
    gate: { rules: [definition-of-done] }
---

Pull-based flow with a WIP limit of your choosing; the gates are the only fixed points.
