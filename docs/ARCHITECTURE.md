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
.sadl.config.json          Host and policy configuration
.sadl_manifest.json        Generated hash manifest
docs/01_PRD.md             Product intent
docs/02_ROADMAP.md         Task ledger
docs/03_STATE.md           Latest handoff
docs/04_ARCH_SPEC.md       Technical boundaries
docs/05_SESSION_LOG.md     Human-readable session ledger
docs/session_logs/*.json   Machine-readable session receipts
```

## Host Adapter

The host adapter is the enforcing layer. In this MVP, the host adapter is the CLI. In later integrations it can be a Codex skill, Claude hook, Cursor rule generator, IDE extension, CI action, or MCP server.

Host responsibilities:

- Validate required files.
- Detect protected file changes.
- Detect tracked secret-like files.
- Generate manifests.
- Pause on approval waits.
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

