# Multi-Agent Orchestration

## Principle

SADL allows multi-agent work only when ownership is explicit. Parallelism without file ownership creates merge conflicts and inconsistent handoffs.

## Recommended Roles

- Coordinator: owns roadmap, state, merge decisions, and final validation.
- Planner: converts PRD and architecture into roadmap tasks.
- Coder: implements one scoped task.
- Tester: writes or repairs tests for a scoped task.
- Reviewer: reviews diff, risk, and missing validation.
- Security reviewer: checks secrets, auth, permissions, and injection risks.
- Docs updater: updates user-facing docs and examples.

## Rules

- One coordinator per repository.
- One active task per worker.
- One branch or worktree per worker.
- Workers must not edit the same source file in parallel.
- Each worker writes a session log.
- Coordinator merges only after validation.

## Example Branches

```text
sadl/task-001-auth-ui
sadl/task-002-auth-api
sadl/task-003-auth-tests
```

## Conflict Handling

If two tasks require the same file, serialize them or create an explicit shared-file plan in the roadmap.

