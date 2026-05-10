# Generic CLI Adapter

## Setup

Any CLI coding agent can use SADL if it can read/write repository files and run shell commands.

## Bootstrap Prompt

```text
You are working in a SADL repository.
Use AGENTS.md as the operating rules.
Do not rely on prior chat history.
Resume from docs/03_STATE.md and docs/02_ROADMAP.md.
Use docs/04_ARCH_SPEC.md for technical constraints.
Run sadl validate and sadl checkpoint before stopping.
```

## Host Rules

The host should enforce:

- no secret file reads
- timeouts for long-running commands
- no repeated command loops
- approval pauses
- checkpoint before termination

