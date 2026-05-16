# SADL Architecture

## Design Principle

SADL separates three responsibilities:

```text
Repository stores truth.
Host enforces policy.
Agents execute scoped work.
```

## Repository Protocol

The repository protocol is portable across IDEs and models.

```text
AGENTS.md                  Agent operating rules
.sadl/config.json          Team policy and validation configuration
.sadl/traceability.json    Requirement/task/evidence ledger
.sadl/runtime.json         Local-only session state and circuit breaker counters
.sadl/approvals.json       Local-only command and exception approvals
.sadl/telemetry.json       Local-only token/cost telemetry
.sadl_manifest.json        Generated hash manifest
docs/01_PRD.md             Product intent
docs/02_ROADMAP.md         Task ledger
docs/03_STATE.md           Latest handoff
docs/04_ARCH_SPEC.md       Technical boundaries
docs/05_SESSION_LOG.md     Human-readable session ledger
docs/session_logs/*.json   Machine-readable session receipts
```

## Traceability Chain

SADL uses `.sadl/traceability.json` to connect:

```text
Requirement -> Task -> Allowed Paths -> Validation Evidence -> Commit/Session Receipt
```

The core CLI does not infer language-level dependency graphs. Task dependencies, allowed paths, and parallel-safety must be explicit in the traceability ledger.

## Machine-Readable Handoff

`docs/03_STATE.md` is both a human handoff and a machine handoff. YAML-style frontmatter records the session id, active task, task id, requirement ids, status, blocker state, next action, model, and update timestamp. The same values are mirrored into `.sadl/runtime.json` so hosts, adapters, and future dashboards can resume without parsing prose.

## Circuit Breakers

Approved validation failures and timeouts are counted per active `TASK-*`. Approval denials are governance waits, not work failures. When the configured policy trips, the CLI marks the task `BLOCKED` in the traceability ledger, updates the roadmap, and rewrites `docs/03_STATE.md` with a recovery handoff. This prevents repeated test/debug loops from becoming token bleed.

## Host Adapter

The host adapter is the enforcing layer. In this MVP, the host adapter is the CLI. In later integrations it can be a Codex skill, Claude hook, Cursor rule generator, IDE extension, CI action, or MCP server.

Host responsibilities:

- Validate required files.
- Detect protected file changes.
- Detect tracked secret-like files.
- Generate manifests.
- Pause on approval waits.
- Trip task-scoped circuit breakers on repeated validation failure or timeout.
- Enforce checkpoint and commit rules.
- Record session receipts.
- Switch models only at checkpoint boundaries.

## Agent Responsibilities

Agents should:

- Read the bootstrap files in order.
- Work only on the active roadmap task.
- Keep changes scoped.
- Split oversized tasks.
- Validate before marking work done.
- Checkpoint before stopping.
- Commit when validation passes and commit policy requires it.

Agents should not:

- Rewrite protected rules to make a task easier.
- Read or print secret values.
- Run open-ended interactive commands.
- Continue during approval waits.
- Edit files owned by another parallel agent.

## Why Markdown And JSON

Markdown is readable by humans and all agents. JSON gives the host a stricter machine-readable control surface. SADL deliberately avoids depending on one IDE, one vendor, or one model memory system.
