# SADL Scenario Handling

## Cold Start

The agent reads `AGENTS.md`, `.sadl.config.json`, `docs/03_STATE.md`, and the active roadmap item. It should not require prior chat history.

## Model Swap

The next model resumes from Git, `docs/03_STATE.md`, and the latest commit. Model-specific memory is treated as optional, not authoritative.

## Token Ceiling

The host should stop source writes near the configured threshold and force a checkpoint. The AI should record status, blocker, next exact action, and dirty files.

## Approval Wait

The session enters `WAITING_FOR_APPROVAL`. The host pauses. Agents should not poll, retry, or continue spending tokens while waiting.

## Search Or Debug Loop

The host should track repeated commands and no-progress time. If budgets are exceeded, the agent checkpoints as `BLOCKED` or `FAILED_TESTS`.

## Human Edit During Session

The host compares Git status or `.sadl_manifest.json`. If relevant files changed outside the agent path, the agent re-audits before continuing.

## Failed Tests

The roadmap item remains `FAILED_TESTS` or `WIP`. The failure, command, and next action are recorded in `docs/03_STATE.md`.

## Secrets Needed

The agent may ask for required environment variable names or setup confirmation. It must never request secret values in chat or commit them to Git.

## Merge Conflict

Complex conflicts require human approval. Trivial conflicts may be resolved only if policy allows and the resolution is validated.

## Production Deploy

Production deploys require explicit human approval. SADL may prepare deployment steps, but should not deploy autonomously by default.

## Parallel Agents

Parallel agents must operate on separate tasks, branches/worktrees, and file ownership scopes. A coordinator merges after validation.

