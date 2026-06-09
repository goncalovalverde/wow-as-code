# Ways of Working as Code — why your engineering culture needs version control

**Platform:** LinkedIn long-form  
**Status:** Draft  
**Tags:** #DevEx #EngineeringCulture #AIAgents #SoftwareEngineering #WaysOfWorking

---

Your team has a Definition of Done.

I know you do, because every engineering team does — eventually. A sprint went sideways, someone called a meeting, and you spent an afternoon agreeing that "done means tested, reviewed, and deployed to staging." Someone wrote it down somewhere. Confluence, probably. Maybe a Notion page or a README section.

That was 18 months ago.

Today, if I asked your newest engineer where that definition lives, what would they say?

---

**This is the real scaling problem nobody talks about.**

We invest enormous energy in scaling infrastructure. We obsess over test coverage, deployment pipelines, architecture decision records. But the agreements that govern *how* we work — code review norms, Definition of Done, security requirements, onboarding expectations — we leave those in a wiki that nobody opens.

The result is predictable:

- New joiners discover the norms 3 months in, usually by violating them
- Norms erode silently because there's no signal when they're not followed
- Senior engineers carry the culture in their heads — and take it with them when they leave
- AI agents generate code with zero awareness of your team's preferences, then you spend review cycles correcting what they got wrong

We version-control everything except the most important thing: how we work.

---

**Here's the gap I kept running into.**

Linters enforce syntax. CI pipelines enforce builds. But there's no enforcer for "we agreed that every PR touching the payments service needs a security review" or "our Definition of Done requires a runbook update for any new failure mode."

Those agreements live outside the toolchain. Which means they live in the gap between what we intend and what we actually do.

The more I thought about this, the more obvious the fix seemed: **treat team agreements like code.**

Not metaphorically. Literally.

Put them in the repo. Give them structure a machine can parse. Give them a schema with fields for enforcement level, owner, trigger context. Let them inherit from parent-level rules the way classes inherit from interfaces. Version-control them. Let CI check them. Let AI agents load them.

---

**What does this actually look like?**

A `wow/` directory — "Ways of Working" — in your team's repo. Each file is structured markdown with YAML frontmatter:

```yaml
---
id: code-review
title: Code Review Norms
category: quality
enforcement: soft
owner: @tech-lead
applies_to: [pr]
last_reviewed: 2026-05-01
---
```

The body is plain markdown — readable by anyone, in any editor, in any GitHub PR view.

The frontmatter is the machine-readable layer. `enforcement: hard` means CI can block on it and no child team can relax it — the platform org sets security requirements that stick. `enforcement: soft` means the agent suggests, but the team decides. `enforcement: info` means surface it, don't police it.

`applies_to` is the context filter. Rules tagged `pr` load when a PR opens. Rules tagged `onboarding` surface on day one. Rules tagged `code-generation` inform your AI assistant. The same body of agreements, surfaced at the right moment.

---

**The inheritance model is where it gets interesting for larger orgs.**

Company-level rules flow down. Unit-level rules refine them. Team-level rules extend them further — within the bounds set above.

```
Company wow/ → Unit wow/ → Team wow/
```

A security team can write a `hard` rule that every team inherits. It can't be overridden. But a team can add their own `soft` norms on top — code review turnaround, pairing preferences, naming conventions — without touching the company baseline.

This is what governance at scale should look like: clear inheritance, field-level merge, locked floors and flexible ceilings.

---

**And then there's the AI angle.**

I've been running Copilot on my team for over a year. It's genuinely useful. But it has no idea what "good" looks like for *our* team. It doesn't know we prefer functional composition over class inheritance, or that our DoD requires a performance benchmark for any API change, or that we never merge on Fridays.

All of that context is implicit. It lives in review comments and retro notes and tribal knowledge.

Now imagine your `wow/` directory loaded as context before every code generation session. Not as a massive dump of everything — filtered by trigger, down to 3-5 relevant files. The agent knows what your Definition of Done says. It knows your architecture principles. It checks its output against your security requirements before you even open a PR.

That's not science fiction. That's a `config.yaml` and a `.github/copilot-instructions.md` reference away.

---

**I'm building this as an open specification.**

Not a SaaS product. Not a proprietary tool. A spec: a directory convention, a JSON schema for frontmatter, an inheritance model, a set of core triggers. A TypeScript CLI for validation and resolution. A GitHub Action that posts a compliance checklist on every PR, generated from your living team agreements.

The goal is simple: make it as easy to codify how your team works as it is to write a unit test.

Because if your norms aren't in the repo, they're not really norms. They're aspirations.

---

**If this resonates, I'd love to hear:**

- Where do your team agreements live today?
- What's the hardest norm to enforce consistently?
- Have you found ways to make AI agents aware of team conventions?

The spec is open at [github.com/goncalovalverde/wow-as-code](https://github.com/goncalovalverde/wow-as-code). Still v1 — feedback welcome.

---

*#DevEx #EngineeringCulture #AIAgents #SoftwareEngineering #WaysOfWorking*
