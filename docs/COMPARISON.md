# SADL And Existing Tools

## Factual Positioning

Several tools already cover parts of this space:

- Spec-driven tools can turn specs into plans and tasks.
- IDE agents can use project rules and memories.
- Cloud coding agents can work on branches and open pull requests.
- Assistant-specific systems can store memories, hooks, permissions, or knowledge.

SADL is different because it is a repository protocol, not a single assistant.

## What SADL Adds

| Capability | SADL Goal |
| --- | --- |
| Cross-IDE handoff | Store state in Git-readable files, not only vendor memory. |
| Cross-model continuity | Any assistant can read the same PRD, roadmap, state, and architecture spec. |
| Session accounting | Keep append-only receipts for work, blockers, approvals, and validation. |
| Secret isolation | Names are documented; values stay local or in secret managers. |
| Multi-agent safety | Require branch/worktree/file ownership before parallel work. |
| Reviewable self-improvement | Dream reports propose changes but do not silently rewrite rules. |

## What SADL Does Not Replace

SADL does not replace:

- The coding model.
- The IDE.
- CI/CD.
- GitHub, GitLab, or issue trackers.
- Human review.
- Secure secret managers.

It provides the common operating layer around them.

