# AI_CODE_REVIEW.md — reviewing changes by agents and people

This guide applies to every change, whether a person, an AI agent, or both wrote it. Code review is for finding what could go wrong and building shared understanding—not for proving that someone read every line. The goal is to reduce review effort without increasing reverts or incidents. Automation can do much of the checking, but people remain responsible for product direction, architecture, security-sensitive decisions, and what ships.

The workflow below adapts [the article on how the Claude Code team reviews code](https://x.com/addyosmani/status/2114604912520921136) to this repository. The project-specific commands and CI description reflect the checked-in workflow. This guide's AI-review and security-review requirements are process requirements; they are not claims that those automated reviewers or GitHub branch-protection rules are already configured here.

## Before opening a pull request

### Agree on the change and its risk

The author—human or agent—should be able to state the intended behavior, acceptance criteria, and affected areas before implementation. Check the relevant project guidance, especially [`CODE_STANDARDS.md`](CODE_STANDARDS.md), [`RULES.md`](RULES.md), and [`CONTEXT.md`](CONTEXT.md). For seed data, also follow [`AUTHORING.md`](AUTHORING.md).

Keep the change small enough to understand, test, and reverse. Preserve game-specific rules and existing behavior unless a behavior change was explicitly requested. If the product decision or technical direction looks wrong, raise that early and pause or change course rather than completing work that should not ship.

Classify risk by the change, not by who wrote it. A documentation correction with no behavior change is usually low risk. Changes to game rules or scoring, state and persistence, database migrations, admin access, secrets, CI, deployment, or other security-sensitive paths need more scrutiny. Start strict; relax a requirement only for an explicitly trusted owner and when experience supports it. If unsure, use the higher level.

### Run checks and show evidence

Give the author a runnable way to verify the work. Run checks appropriate to the affected code, then report the actual commands and results; do not say a check passed unless it ran. For visible UI changes, exercise the relevant flow in the app and include what was checked (a screenshot is useful when it clarifies the result).

Run these from the repository root. Each subshell returns to the root before the next command group:

```sh
(
  cd ta7ady-backend
  ./mvnw -B verify
)
(
  cd ta7ady-frontend
  npm ci
  npx ng build
  npx ng test --watch=false
)
```

The current CI workflow runs backend verification, frontend build and tests, PostgreSQL initialization verification, and Docker image builds on pushes and pull requests. See [`DEPLOY.md`](DEPLOY.md) for details. Report skipped checks and why, failures, and any remaining uncertainty instead of hiding them.

Before opening the PR, have someone other than the implementer—or an agent working with fresh context—review the change against its intent and the surrounding code. The reviewer should look for regressions and root causes, not just whether the patch looks plausible. Findings should identify the exact file and line, explain the concrete failure, and distinguish new problems from pre-existing ones. Avoid style-only noise. Fix each valid finding or resolve it with a short reason; do not leave a substantive finding silently open.

## Required review on every pull request

Every PR receives an AI code review before human review and a security review. The current checked-in CI runs tests and builds but does not itself provide these reviews. Until automated reviewers are configured as required PR checks, run and record both reviews explicitly; do not describe them as machine-enforced CI gates.

### AI code review

Review the PR's stated intent and diff in the context of the relevant codebase. Check that the change solves the requested problem, fits the surrounding design, and does not break other behavior. For a bug fix, look for the root cause. A fresh-context reviewer should report actionable findings with file and line references and an overall count, including a clear “no issues” result when there are none.

Where multi-agent review is available, independent reviewers can hunt for bugs in parallel, followed by a separate validation pass. Surface only confirmed, useful findings; filter style-only cleanup; label severity and mark pre-existing problems accurately. Fix every valid finding, or resolve the thread with a short reason. No confirmed code-review finding should remain open at merge.

### Security review

Every PR also gets a security-focused review. The target is an automated security review on each PR that blocks merging while it has an open credible finding. Until that automation exists, perform and record a security-focused review for every PR; scale its depth to the change, and do not approve a high-risk change with an unresolved security concern. Pay particular attention to authentication and admin gates, input handling, secrets, database access, CI, and deployment. Fix a valid finding or document why it is a false positive; do not silently dismiss it.

### Blocking project checks

Do not merge with failing or missing required CI checks. A workflow existing in the repository does not by itself prove that GitHub branch protection requires it; do not bypass a required gate. The checked-in workflow runs the checks above on pushes and pull requests. On tags, its release job builds and pushes application images to GHCR.

## Human approval, merging, and rollout

Scale human approval by the risk of the change. Routine documentation changes can receive a quick review. High-risk changes require review by a human who can judge the relevant product and technical decisions, with at least one approver other than the author or agent operator. Changes under `.github/workflows/` and other owner-designated sensitive paths always require an additional human approval. For this repository, treat changes to authentication or admin access, secrets, database migrations, and release or deployment controls as sensitive. An agent's approval never counts as human approval; the person operating an agent-authored change is accountable for it.

A lighter approval path is only for explicitly trusted repository owners, never simply because the author is a person or an agent. Treat each approval as valid only for the exact commit reviewed. After every new commit, dismiss or renew prior approvals and review the new diff; if GitHub settings do not enforce dismissal, consider the approval stale and do not merge until it is refreshed. If an independent human reviewer is required but unavailable, keep the PR open rather than treating an AI review as a substitute.

Use a merge queue, feature flags, internal release, or staged rollout when appropriate. These are recommendations, not safeguards evidenced by the checked-in workflow: it documents push/PR checks and a tag-triggered image release, but does not show a merge queue, feature-flag rollout, internal/staged release, post-deploy monitoring, or automatic rollback. State the intended rollout and how to disable or revert the change in the PR. For database or persistent-data changes, assess recovery and data compatibility before deployment and follow [`DATABASE_MIGRATIONS.md`](DATABASE_MIGRATIONS.md); a code revert alone may not reverse a migration safely. Watch for failures, incidents, and reverts after release, and make it easy to stop or reverse a bad change.

Suggested PR notes:

```text
Intent / expected behavior:
Risk and affected areas:
Checks run and results:
AI review and finding resolutions:
Security review and finding resolutions:
Human approver(s):
Rollout and how to disable/revert:
```

## Human judgment and responsibility

Automation should reserve human attention for decisions that need judgment: whether to build a feature, whether the design fits the product, whether an architectural choice is sound, and whether a security-sensitive change is acceptable. Before approving, inspect the evidence—test output, commands, screenshots, and review findings—and understand what the checks could miss. If you cannot assess that, ask for a real review from someone with the needed context. A person is accountable for every change that ships, including one authored by an agent; an agent cannot take responsibility for the result.

Review also helps people understand the codebase. When a diff is routine or an area is unfamiliar, use a targeted, code-grounded explanation of the affected module to build context rather than treating line-by-line reading as the only way to learn. Verify explanations against the code and documentation, and make important decisions visible to the team. When a change is small, reversible, and understood, its author should normally help fix any problem it causes. Incident review should improve the checks and system, not assign blame.

## Improve reviewers and make review converge

Track review effort alongside outcomes. Useful measures include median and 95th-percentile human approvals per PR, human comments, and time waiting for a person. Compare these with revert and incident rates: less reviewer time is not an improvement if it merely moves the work to post-release fixes. If these measures are not being collected, do not claim that review effort or quality has improved.

Keep a set of verified bugs from incidents, reverts, and fixes. For each, have a knowledgeable person confirm the failure, its location, and the correct fix. Re-run reviewer changes against these examples and against known-clean changes so missed bugs and noisy or harmful findings are both visible. Treat reviewer comments as signals to assess: fixed, rejected as incorrect, clarified as intentional, or judged unimportant. If the same valid issue keeps recurring, fix its source with clearer project guidance, a test, lint rule, or other check rather than repeating the same comment.

Review loops must end. Limit routine review to a few rounds; after three cycles, pause and reconsider the approach instead of continuing an automatic back-and-forth. After the initial review rounds, focus re-review on the new diff, state the class of bugs being checked, and do not repeat unchanged findings. Additional rounds can be justified for high-risk changes, but they should have a clear purpose. Re-evaluate the reviewer whenever its prompts, tools, or model change.

## Source and related project guidance

- [Addy Osmani's article on the Claude Code review process](https://x.com/addyosmani/status/2114604912520921136)
- [`CODE_STANDARDS.md`](CODE_STANDARDS.md) — architecture, behavior preservation, and quality gates
- [`DEPLOY.md`](DEPLOY.md) and [`DATABASE_MIGRATIONS.md`](DATABASE_MIGRATIONS.md) — current CI, deployment, and data-safety guidance
