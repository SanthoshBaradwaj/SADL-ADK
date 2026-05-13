# Codex Adapter

## Setup

Use the standard SADL files. Codex can read `AGENTS.md` and repository files directly.

## Recommended Prompt

```text
Use SADL for this repository.
Follow AGENTS.md.
Before editing, read .sadl/config.json, docs/03_STATE.md, and the active item in docs/02_ROADMAP.md.
Keep changes scoped to the active task.
Run validation commands from .sadl/config.json when applicable.
Run sadl checkpoint before stopping.
Commit relevant files if validation passes and commit policy requires it.
```

## Notes

- Keep secrets out of chat.
- Use branch-per-task for larger work.
- Use `sadl validate` before final response.
