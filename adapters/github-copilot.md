# GitHub Copilot Coding Agent Adapter

## Setup

Store SADL files in the repository so Copilot coding agent can read them from assigned issues or branches.

## Issue Template

```markdown
Use SADL.

Roadmap task:

Expected files:

Validation commands:

Before finishing:
- Update docs/03_STATE.md.
- Append a session receipt.
- Ensure no secrets are committed.
- Open a PR with validation evidence.
```

## Notes

Use GitHub branch protections, required checks, and secret scanning alongside SADL.

