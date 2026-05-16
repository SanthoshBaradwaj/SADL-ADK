# SADL Usage Guide

## New Project

```bash
npx create-sadl-project@latest my-app
cd my-app
```

Complete:

```text
docs/01_PRD.md
docs/04_ARCH_SPEC.md
.sadl/config.json
.env.example
```

Validate:

```bash
npx --package create-sadl-project@latest sadl prd-check . --fix-propose
npx --package create-sadl-project@latest sadl validate . --strict
```

Start the first agent session:

```bash
npx --package create-sadl-project@latest sadl start .
```

For guided setup:

```bash
npx --package create-sadl-project sadl intake . --write
npx --package create-sadl-project sadl plan . --write
npx --package create-sadl-project sadl policy . --apply solo
```

## Existing Project

```bash
cd existing-repo
npx --package create-sadl-project@latest sadl adopt .
npx --package create-sadl-project@latest sadl validate .
```

Then fill the missing PRD and architecture sections. Do not start code work until `sadl validate --strict` passes or every failure is intentionally accepted by a human.

## PRD Sufficiency

```bash
npx --package create-sadl-project sadl prd-check .
npx --package create-sadl-project sadl prd-check . --fix-propose
npx --package create-sadl-project sadl trace .
```

`prd-check` acts like a linter for human requirements. It checks required PRD concepts, catches empty scope firewalls, warns on vague words like `fast` or `secure` without measurement, and writes requirement proposals to `.sadl/traceability.json` without mutating `docs/01_PRD.md`.

After `--fix-propose`, the PRD hash is sync-locked into traceability. Editing the PRD later causes `sadl validate` to fail until the change is reviewed and re-synced.

## Traceability

Generate task IDs from approved requirement proposals:

```bash
npx --package create-sadl-project sadl plan . --write
npx --package create-sadl-project sadl trace .
```

Roadmap tasks use `TASK-*` and requirement IDs. Checkpoints can update the traceability ledger:

```bash
sadl checkpoint . \
  --task-id TASK-001 \
  --task "TASK-001 Implement first MVP workflow" \
  --status DONE \
  --validation "tests passed"
```

## Migrating Older SADL Projects

Projects created before the `.sadl/` state contract can be upgraded in place:

```bash
npx --package create-sadl-project@latest sadl migrate .
npx --package create-sadl-project@latest sadl doctor .
```

Migration creates `.sadl/config.json`, `.sadl/traceability.json`, and local-only runtime, approval, and telemetry files. Legacy `.sadl.config.json` is backed up and left in place for compatibility.

## Agent Prompt

Use this with any coding assistant:

```text
Use SADL for this repository.
Follow AGENTS.md exactly.
Read .sadl/config.json, docs/03_STATE.md, and the active item in docs/02_ROADMAP.md.
Work only on the active roadmap item.
Do not read secret values.
Validate using configured commands.
Run sadl checkpoint before stopping.
Commit the relevant files if validation passes.
```

## Checkpoint

```bash
sadl checkpoint . \
  --task-id TASK-001 \
  --task "1.1 Implement login form" \
  --status DONE \
  --model "configured-coder" \
  --commands "npm test,npm run lint" \
  --validation "lint and tests passed" \
  --next "Start task 1.2 API session endpoint"
```

Checkpoints write strict frontmatter to `docs/03_STATE.md` and synchronize `.sadl/runtime.json`. The frontmatter is the machine-readable handoff; the Markdown body is the human-readable summary.

## Commit

```bash
sadl commit . --paths src/login.js,tests/login.test.js --message "sadl: complete login form"
```

The commit command refuses to commit if SADL validation has hard failures. In non-interactive/agent usage, `--paths` is required so the agent declares its commit blast radius.

## Validation Runner

Run configured commands from `.sadl/config.json`:

```bash
npx --package create-sadl-project sadl run . --category test --yes
npx --package create-sadl-project sadl validate . --run --yes
```

Without `--yes` or a matching local approval, SADL pauses or fails closed before executing configured commands. Use `--trust-command` only after reviewing the command and project scripts.

## CI, Dashboard, And Adapters

```bash
npx --package create-sadl-project sadl ci .
npx --package create-sadl-project sadl dashboard .
npx --package create-sadl-project sadl adapter . --tool cursor
npx --package create-sadl-project sadl adapter . --tool claude-code
```

## Multi-Agent Helpers

```bash
npx --package create-sadl-project sadl branch . --task "1.1 Auth UI"
npx --package create-sadl-project sadl worktree . --task "1.2 Billing webhook" --dir ../billing-webhook
```

## Dream Pass

```bash
sadl dream .
```

This writes a report under `docs/dreams/`. It is review-only. It may suggest rule, architecture, or tooling improvements, but agents must not auto-apply those changes.
