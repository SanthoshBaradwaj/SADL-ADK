# SADL Usage Guide

## New Project

```bash
sadl init my-app
cd my-app
```

Complete:

```text
docs/01_PRD.md
docs/04_ARCH_SPEC.md
.sadl.config.json
.env.example
```

Validate:

```bash
sadl validate . --strict
```

Start the first agent session:

```bash
sadl start .
```

## Existing Project

```bash
cd existing-repo
sadl adopt .
sadl validate .
```

Then fill the missing PRD and architecture sections. Do not start code work until `sadl validate --strict` passes or every failure is intentionally accepted by a human.

## Agent Prompt

Use this with any coding assistant:

```text
Use SADL for this repository.
Follow AGENTS.md exactly.
Read .sadl.config.json, docs/03_STATE.md, and the active item in docs/02_ROADMAP.md.
Work only on the active roadmap item.
Do not read secret values.
Validate using configured commands.
Run sadl checkpoint before stopping.
Commit the relevant files if validation passes.
```

## Checkpoint

```bash
sadl checkpoint . \
  --task "1.1 Implement login form" \
  --status DONE \
  --model "configured-coder" \
  --commands "npm test,npm run lint" \
  --validation "lint and tests passed" \
  --next "Start task 1.2 API session endpoint"
```

## Commit

```bash
sadl commit . --message "sadl: complete login form"
```

The commit command refuses to commit if SADL validation has hard failures.

## Dream Pass

```bash
sadl dream .
```

This writes a report under `docs/dreams/`. It is review-only. It may suggest rule, architecture, or tooling improvements, but agents must not auto-apply those changes.

