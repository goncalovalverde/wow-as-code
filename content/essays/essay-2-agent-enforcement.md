# Your Definition of Done exists. Your AI agent has never seen it.

**Platform:** LinkedIn long-form  
**Status:** Draft  
**Tags:** #DevEx #EngineeringCulture #AIAgents #SoftwareEngineering #WaysOfWorking

---

It's Tuesday afternoon. Sprint planning.

The team is estimating a new feature in the payments service. Three story points, maybe five. Someone mentions the API surface, someone else raises a database migration. The discussion is good. The estimate lands.

Nobody mentions the security review.

Not because the team is careless. The requirement exists. It's in Confluence, under "Definition of Done for payments-related work," last updated fourteen months ago by someone who has since left. Nobody checked because nobody knew to check. The norm wasn't in the room.

Two weeks later, the PR opens. A senior engineer spots it immediately. Leaves a comment: "this needs a security review before merge."

The sprint is at risk. The engineer has left this comment before. They will leave it again.

---

**This is not a people problem.**

You're paying a senior salary to enforce what a structured file could catch for free. The norm exists. The team isn't ignoring it. The system just never surfaced it when it mattered.

And here's the part that should concern you if you're running AI-assisted teams: your agents have the same blind spot. Worse, actually. A new hire eventually learns the unwritten rules, usually by violating them. An agent never gets that signal. It will generate code, draft PRs, and scaffold features with zero awareness of your team's constraints, every single time, unless you engineer those constraints into its context.

The agent isn't the problem. The input is.

---

**What the fix actually looks like.**

The security review requirement needs to exist in two places: at the moment the team is planning work, and at the moment a PR is opened. Right now it exists in neither. It exists in Confluence, which is to say it exists nowhere.

Now imagine that requirement lives in a structured file in your repo:

```yaml
---
id: payments-security-review
title: Security Review for Payments Changes
category: quality
enforcement: hard
owner: @security-lead
applies_to: [pr, code-generation, planning]
last_reviewed: 2026-05-01
---

Any change to the payments service requires a security review before merge.
This includes API surface changes, dependency updates, and schema migrations.
```

That file changes two things at once.

At PR time, a GitHub Action reads it and posts a compliance checklist. The security review is a required item. Not a reminder in a comment. A check. `enforcement: hard` means it can't be relaxed by a child team and CI can block on it.

At planning time, a Jira automation surfaces the constraint when a ticket is created or moved into a sprint. The team sees the requirement before estimation, not after the PR is already open. And when an agent is helping scope or scaffold the work, the same file loads as context. It flags the requirement in the planning conversation, not in a review comment two weeks later.

One file. Multiple enforcement surfaces. Written once, maintained in version control, owned by someone.

---

**The constraint already exists in your organisation.**

It lives in your senior engineer's head. In a Confluence page nobody opens. In a comment left on a PR last Thursday.

The question isn't whether to create the constraint. You already have it. The question is whether you've engineered it into the workflow or left it to decay in the gap between what you intend and what you actually do.

A better model won't close that gap. Treating context maintenance as engineering work will.

---

**Where do your hardest-to-enforce norms live today?**

The spec is open at [github.com/goncalovalverde/wow-as-code](https://github.com/goncalovalverde/wow-as-code). Still building. Feedback welcome.

---

*#DevEx #EngineeringCulture #AIAgents #SoftwareEngineering #WaysOfWorking*
