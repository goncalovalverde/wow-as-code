# Onboarding Automation Guide

> How to automatically surface team ways of working when new members join.

---

## Overview

The `onboarding` trigger fires when a new team member needs context about team norms. This guide covers how to **automate** that trigger so new joiners receive WoW rules without manual intervention.

---

## Option 1: GitHub Action (Recommended for GitHub teams)

A GitHub Action listens for the `membership` event and creates a welcome issue with all onboarding-tagged rules.

### How it works

```
New member added to GitHub team
        ↓
membership webhook fires
        ↓
GitHub Action checks out repo
        ↓
wow show --trigger onboarding → generates digest
        ↓
Creates issue assigned to new member
```

### Setup

1. Copy `.github/workflows/onboarding.yml` to your repository
2. Ensure your WoW files have `onboarding` in their `applies_to` field
3. The action will auto-create a welcome issue for each new team member

### Customization

- Change the issue title/labels in the workflow file
- Add a Slack notification step (see Option 3)
- Use `--format json` instead of `--format markdown` for structured output

---

## Option 2: Jira Automation (For Jira-based teams)

### Setup (5 minutes, no code)

1. Go to **Project Settings → Automation**
2. Create a new rule:

   **Trigger:** User added to project role  
   **Action:** Create issue with these fields:

   | Field | Value |
   |-------|-------|
   | Summary | `Review team ways of working` |
   | Type | Task |
   | Assignee | `{{triggerUser}}` |
   | Description | *(paste your DoD + key rules below)* |
   | Labels | `onboarding` |

3. In the description, include your team's key rules:

```
## Welcome! Please review our team agreements:

### Definition of Done
- [ ] Code compiles and passes all existing tests
- [ ] New code has unit tests (≥80% coverage for new lines)
- [ ] API changes are documented in OpenAPI spec
- [ ] No new lint warnings introduced
- [ ] PR description explains the "why", not just the "what"
- [ ] Relevant monitoring/alerting updated if applicable

### Code Review Norms
- [ ] Read our code-review.md in the wow/ directory
- [ ] Understand what triggers a blocking review

### Architecture Principles
- [ ] Read architecture-principles.md in the wow/ directory

---

Once reviewed, mark this task as Done.
Full details: [wow/ directory](link-to-your-repo/wow/)
```

### Advanced: Dynamic content via ScriptRunner or Forge

For teams that want the Jira task to always reflect the latest WoW files:

```javascript
// ScriptRunner / Forge snippet (pseudocode)
const response = await fetch('https://raw.githubusercontent.com/{org}/{repo}/main/wow/config.yaml');
const config = parseYaml(response);
const onboardingFiles = config.files.filter(f => f.applies_to.includes('onboarding'));
// Build description from filtered files
```

---

## Option 3: Slack Bot (For Slack-first teams)

### Using Slack Workflow Builder (no code)

1. **Trigger:** Member joins a specific channel (e.g., `#team-checkout`)
2. **Step 1:** Send a message to the new member:

   > 👋 Welcome to the team! Here are our ways of working:
   >
   > 📋 *Definition of Done:* <link>
   > 🔍 *Code Review Norms:* <link>
   > 🏗️ *Architecture Principles:* <link>
   >
   > Please review these before your first PR.

### Using a custom Slack bot

```yaml
# Slack event: member_joined_channel
# Bot reads wow/ files and posts a formatted summary

event: member_joined_channel
channels: ["#team-checkout", "#team-payments"]
action:
  - run: wow show --trigger onboarding --format json
  - post_message:
      channel: DM to new member
      blocks: # Slack Block Kit formatted output
```

---

## Option 4: Azure AD / Entra Group Assignment

For enterprises using Azure AD:

1. **Trigger:** User assigned to an Azure AD group (via Logic App or Power Automate)
2. **Action:** Send welcome email with WoW digest or create a DevOps work item

---

## Combining Approaches

Most teams benefit from layering:

| Layer | Tool | Purpose |
|-------|------|---------|
| Persistent reference | GitHub issue | Trackable, closeable when reviewed |
| Immediate notification | Slack message | Gets attention on day 1 |
| Ongoing reinforcement | Copilot instructions | Agent reminds during first PRs |

---

## Best Practices

1. **Tag all key files with `onboarding`** — don't limit to just DoD
2. **Keep the digest short** — link to full files rather than inlining everything
3. **Make it closeable** — use an issue/task so the new joiner signals "I've read this"
4. **Pair with a buddy** — automation doesn't replace human welcome, it augments it
5. **Review quarterly** — ensure the auto-generated content stays relevant

---

## Related

- [Triggers Specification](../spec/triggers.md) — full `onboarding` trigger definition
- [Agent Integration Guide](./agent-integration.md) — how agents use WoW files at runtime
- [Getting Started](./getting-started.md) — setting up your first WoW files
