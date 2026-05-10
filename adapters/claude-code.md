# Claude Code Adapter

## Setup

Create or symlink a `CLAUDE.md` that points to `AGENTS.md`, or copy the relevant SADL bootstrap instructions into Claude Code's project memory.

Recommended `CLAUDE.md` content:

```markdown
This repository uses SADL. Follow AGENTS.md as the source of truth.
```

## Hooks

Claude Code hooks can enforce:

- no `.env` reads
- `sadl validate` before completion
- `sadl checkpoint` on stop
- protected file approval

Keep hook logic host-owned. Do not let agents rewrite hooks without review.

