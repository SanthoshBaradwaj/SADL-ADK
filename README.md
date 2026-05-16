# SADL Kit

SADL, the Stateless AI Development Lifecycle, is a repo-native operating protocol for AI-assisted software development. It treats the repository as durable memory and AI assistants as interchangeable execution workers.

SADL is not another coding model. It is the lifecycle layer around coding agents: specifications, roadmaps, checkpoints, validation, session logs, secret safety, and handoff rules that work across IDEs and agentic platforms.

## What SADL Solves

AI coding sessions often fail in predictable ways:

- The next model does not know what the previous model did.
- Work gets stuck in search, test, or approval loops.
- Secrets leak into chat, docs, or commits.
- A large task is attempted in one session and left half-broken.
- Different IDEs and assistants use different memory systems.
- Teams cannot tell what was actually done, what it cost, or why a session failed.

SADL fixes this by storing project truth in Git-readable files and requiring every session to end with a checkpoint, commit, or explicit blocker.

## What You Get

- Universal project template for stateless AI development.
- Dependency-light Node CLI for initialization, validation, checkpoints, logs, and reflection.
- Structured Markdown docs for PRD, roadmap, state, architecture, and session history.
- Machine-readable team state in `.sadl/config.json` and `.sadl/traceability.json`.
- Local-only runtime, approval, and telemetry state.
- Secret-safe defaults.
- Security gates for configured command execution and path-aware commits.
- PRD sufficiency checks and PRD/traceability sync-locking.
- Traceable roadmap tasks with `TASK-*` IDs, requirement links, allowed paths, and evidence records.
- Multi-agent and model-switch rules.
- Review-only `dream` pass that finds repeated waste or blockers from session logs.
- Adapter notes for Codex, Claude Code, Cursor, Kiro, Gemini, GitHub Copilot coding agent, and generic CLI agents.

## CLI First, UI Next

SADL starts as a CLI because the control plane must be reliable before a UI observes it. Today `sadl dashboard` generates a local static report. A future `sadl dashboard --live` cockpit will watch `.sadl/` state transitions, validation output, approval gates, blockers, and traceability health without requiring a cloud backend.

## Repository Layout

```text
sadl-kit/
+-- bin/                       # CLI entry points
+-- src/                       # CLI implementation
+-- templates/project/         # SADL project skeleton
+-- schemas/                   # JSON schemas
+-- adapters/                  # Tool-specific usage notes
+-- docs/                      # Product docs and BKMs
+-- examples/                  # Real usage examples
+-- tests/                     # CLI tests
```

A generated SADL project contains:

```text
project-root/
+-- AGENTS.md                  # Primary agent operating rules
+-- .agent_rules.md            # Compatibility alias for agents that expect it
+-- .sadl/
|   +-- config.json            # Team policy, validation, token, model, secret rules
|   +-- traceability.json      # Requirement/task/evidence ledger
|   +-- runtime.json           # Local-only session state, gitignored
|   +-- approvals.json         # Local-only command/secret approvals, gitignored
|   +-- telemetry.json         # Local-only token/cost telemetry, gitignored
+-- .sadl.config.json          # Legacy compatibility config
+-- .sadl_manifest.json        # Generated hash manifest
+-- .env.example               # Secret names only, never values
+-- docs/
|   +-- 01_PRD.md              # Product intent
|   +-- 02_ROADMAP.md          # Task ledger
|   +-- 03_STATE.md            # Latest handoff
|   +-- 04_ARCH_SPEC.md        # Technical boundaries
|   +-- 05_SESSION_LOG.md      # Human-readable session receipts
|   +-- setup-env.md           # Environment variable setup by name
|   +-- decisions/             # Proposed ADRs
|   +-- session_logs/          # Machine-readable JSON receipts
+-- src/
+-- tests/
```

## Run Locally

From this repository:

```bash
node bin/sadl.js help
node bin/sadl.js init my-app
node bin/sadl.js validate my-app
```

On Windows PowerShell, if `npm test` is blocked by execution policy, run the tests directly:

```bash
node tests/sadl-cli.test.js
```

## Published Usage

SADL is published on npm as `create-sadl-project`:

Current npm channels:

```text
latest: 0.2.0-next.0
next:   0.2.0-next.0
stable: 0.1.1
```

Zero-install usage for the current default build:

```bash
npx create-sadl-project my-app
cd my-app
npx --package create-sadl-project sadl validate .
npx --package create-sadl-project sadl start .
```

Optional global install:

```bash
npm install -g create-sadl-project
create-sadl-project my-app
cd my-app
sadl validate .
sadl start .
```

Stable rollback channel:

```bash
npx create-sadl-project@stable my-app
cd prototype-app
npx --package create-sadl-project@stable sadl validate .
```

For an existing repository:

```bash
cd existing-project
npx --package create-sadl-project sadl adopt .
npx --package create-sadl-project sadl validate .
```

## Core Commands

```bash
sadl init [path]          # Create SADL files in a new project
sadl adopt [path]         # Add SADL files to an existing project
sadl intake               # Print or run structured intake
sadl prd-check [path]     # Check PRD sufficiency and propose requirement IDs
sadl plan                 # Generate a first roadmap from the PRD
sadl trace [path]         # Show requirement/task/evidence traceability
sadl start [path]         # Show agent bootstrap instructions
sadl status [path]        # Show active task, state, git, validation summary
sadl validate [path]      # Check required files, state, secrets, manifest
sadl run [path] --yes     # Run approved lint/test/typecheck/build commands
sadl manifest [path]      # Generate file hash manifest
sadl checkpoint [path]    # Update state and append session logs
sadl dream [path]         # Analyze session logs and propose improvements
sadl dashboard [path]     # Generate a local HTML session dashboard
sadl branch [path]        # Create a task branch
sadl worktree [path]      # Create a task worktree
sadl ci [path]            # Add a GitHub Action for SADL validation
sadl policy [path]        # List/apply policy packs
sadl adapter [path]       # Generate tool-specific adapter instructions
sadl commit [path] --paths src/file.ts # Validate, stage explicit paths, and commit
```

## How To Use SADL For A New App

1. Create the project shell:

```bash
npx create-sadl-project my-app
cd my-app
```

2. Fill the required planning files manually, or run the intake wizard:

```bash
sadl intake . --write
```

Manual files:

```text
docs/01_PRD.md
docs/04_ARCH_SPEC.md
.sadl/config.json
.env.example
docs/setup-env.md
```

3. Validate readiness:

```bash
sadl prd-check . --fix-propose
sadl validate . --strict
```

4. Generate a first roadmap:

```bash
sadl plan . --write
sadl trace .
```

Then ask an AI assistant to refine it if needed:

```text
Use SADL.
Read AGENTS.md, .sadl/config.json, docs/01_PRD.md, and docs/04_ARCH_SPEC.md.
Generate granular tasks in docs/02_ROADMAP.md.
Do not implement yet.
Mark the roadmap NEEDS_REVIEW for human approval.
```

5. Approve the roadmap, then start implementation:

```text
Use SADL.
Continue the active roadmap task.
Work only on that task.
Validate using .sadl/config.json.
Run sadl checkpoint before stopping.
Commit relevant files if validation passes.
```

6. End every session with one of:

```text
DONE_COMMITTED
WIP_CHECKPOINTED
BLOCKED_WITH_STATE
WAITING_FOR_APPROVAL
```

## Security Model

SADL fails closed around risky local actions:

- `sadl run` and `sadl validate --run` require command approval, `--yes`, or a matching local command fingerprint.
- `sadl commit` requires explicit `--paths` for non-interactive/agent use instead of staging the whole repo.
- `.sadl/runtime.json`, `.sadl/approvals.json`, and `.sadl/telemetry.json` are local-only and gitignored.
- Generated GitHub Actions pin the SADL package version instead of using mutable `latest`.

See [SECURITY.md](SECURITY.md) for the full trust boundary.

## PRD Input Modes

SADL supports three PRD intake patterns.

### Guided Intake Wizard

Best for prototypes and users who do not want to hand-write a full PRD:

```bash
npx --package create-sadl-project sadl intake . --write
```

This writes:

```text
docs/01_PRD.md
docs/04_ARCH_SPEC.md
.env.example
docs/setup-env.md
.sadl/config.json validation commands
```

### Structured JSON Intake

Best for automation, product forms, hosted onboarding, or another app generating SADL inputs:

```bash
npx --package create-sadl-project sadl intake . --from-json intake.json
```

The JSON is validated against `schemas/intake.schema.json`.

### Manual PRD Upload Or Edit

Best for teams that already have a PRD or architecture document:

```text
docs/01_PRD.md
docs/04_ARCH_SPEC.md
```

After editing manually:

```bash
npx --package create-sadl-project sadl validate . --strict
npx --package create-sadl-project sadl plan . --write
```

The PRD defines intent. The architecture spec defines technical boundaries. The roadmap turns both into small tasks.

## PRD Sufficiency And Sync Lock

Run this before planning or after any PRD edit:

```bash
sadl prd-check .
sadl prd-check . --fix-propose
```

`prd-check` verifies concept coverage, flags unresolved placeholders, warns on vague words without measurable acceptance criteria, and can propose requirement IDs into `.sadl/traceability.json` without rewriting `docs/01_PRD.md`. Once proposed, SADL stores the PRD hash in the traceability ledger. If the PRD changes later, `sadl validate` reports a PRD/traceability desync until the human reviews and re-runs `sadl prd-check --fix-propose`.

## Traceability Ledger

After `sadl prd-check --fix-propose`, run:

```bash
sadl plan . --write
sadl trace .
```

The generated roadmap uses explicit task and requirement IDs:

```text
- [TODO] [TASK-001] [FR-001] Implement: User can create a task
```

`.sadl/traceability.json` stores each task's requirement links, default `allowedPaths`, dependencies, risk level, human-review requirement, and checkpoint evidence. Agents should preserve these IDs in roadmap updates and pass `--task-id TASK-001` when checkpointing.

## AI Workflow Configuration

SADL supports a common pattern for all AI coding assistants:

```text
Read AGENTS.md.
Read .sadl/config.json.
Read docs/03_STATE.md.
Read the active item in docs/02_ROADMAP.md.
Read relevant parts of docs/04_ARCH_SPEC.md.
Work only on the active task.
Validate.
Checkpoint.
Commit if valid.
```

User preferences live in `.sadl/config.json`:

```json
{
  "modelPolicy": {
    "planner": "user-configured",
    "coder": "user-configured",
    "reviewer": "user-configured",
    "fallbackChain": [],
    "switchOnlyAtCheckpoints": true
  },
  "tokenPolicy": {
    "hostManaged": true,
    "handoffThresholdPercent": 85,
    "reserveFinalPercent": 10
  },
  "approvalPolicy": {
    "requireHumanFor": [
      "architecture_change",
      "production_deploy",
      "secret_access",
      "merge_conflict",
      "protected_file_change"
    ]
  }
}
```

Current implementation:

- SADL records preferred planner/coder/reviewer roles in config.
- SADL records fallback-chain intent in config.
- SADL supports adapter files for common assistants.
- SADL supports branch/worktree helpers for multi-agent work.
- SADL supports `WAITING_FOR_APPROVAL` and `BLOCKED` handoff states.
- SADL does not currently run a daemon that watches token usage live.
- SADL does not currently auto-launch Claude, Codex, Gemini, or other agents.
- SADL does not currently perform automatic model routing.

The current handoff is checkpoint-driven, not daemon-driven. If all AI sessions are done, the repo remains resumable because `docs/03_STATE.md`, `docs/02_ROADMAP.md`, and Git contain the handoff. A future host adapter, MCP server, IDE extension, or CI integration can watch usage and trigger handoffs automatically.

## Supported AI Assistants

SADL is assistant-agnostic. It works with any AI coding assistant that can read/write files and follow repository instructions.

Current adapter command:

```bash
npx --package create-sadl-project sadl adapter . --tool claude-code
npx --package create-sadl-project sadl adapter . --tool cursor
npx --package create-sadl-project sadl adapter . --tool codex
npx --package create-sadl-project sadl adapter . --tool gemini
npx --package create-sadl-project sadl adapter . --tool github-copilot
npx --package create-sadl-project sadl adapter . --tool generic-cli
```

Supported pattern today:

- Codex / OpenAI coding agents: use `AGENTS.md` directly.
- Claude Code: generate `CLAUDE.md` and rely on Claude project memory/hooks/subagents where configured by the user.
- Cursor: generate `.cursor/rules/sadl.mdc`.
- Gemini or generic CLI agents: generate assistant-specific instruction files.
- GitHub Copilot coding agent: generate `.github/copilot-instructions.md`.

Multi-agent usage is supported as a repository workflow:

```bash
npx --package create-sadl-project sadl branch . --task "1.1 Auth UI"
npx --package create-sadl-project sadl worktree . --task "1.2 Billing webhook" --dir ../billing-webhook
```

Rules:

- one coordinator owns roadmap/state
- one branch or worktree per worker
- no two agents edit the same source file in parallel
- each worker validates and checkpoints
- humans approve architecture changes, production deploys, and merge conflicts

Automatic agentic handoff across multiple running AI products is not implemented in the CLI yet. The common configuration pattern is present; the automated orchestrator is future host work.

## How To Use SADL With Any AI Coding Assistant

Paste this as the starting instruction:

```text
Use SADL for this repository.
Follow AGENTS.md exactly.
Read .sadl/config.json, docs/03_STATE.md, and the active item in docs/02_ROADMAP.md before editing.
Read docs/04_ARCH_SPEC.md for technical constraints.
Do not read .env files or request secret values.
Work only on the active roadmap task.
If the task is too large, split it in docs/02_ROADMAP.md and stop for approval.
Run validation commands from .sadl/config.json.
Run sadl checkpoint before stopping.
Commit relevant files if validation passes and commit policy requires it.
```

## Checkpoint Example

```bash
sadl checkpoint . \
  --task "1.1 Create auth UI shell" \
  --status DONE \
  --model "configured-coder" \
  --commands "npm test,npm run lint" \
  --validation "passed" \
  --next "Start 1.2 Implement auth API route"
```

## Commit Example

```bash
sadl commit . --paths src/auth-ui.js,tests/auth-ui.test.js --message "sadl: complete auth UI shell"
```

The commit command runs SADL validation first and refuses to commit when hard failures are present. Non-interactive agents must provide `--paths`; SADL no longer stages the whole repo with `git add -A`.

## Prototype-Friendly Flow

For fast prototypes, use the smallest useful loop:

```bash
npx create-sadl-project prototype-app
cd prototype-app
npx --package create-sadl-project sadl intake . --write
npx --package create-sadl-project sadl plan . --write
npx --package create-sadl-project sadl policy . --apply solo
npx --package create-sadl-project sadl validate .
```

Then hand the repo to your AI assistant with the SADL prompt. When the session ends:

```bash
npx --package create-sadl-project sadl checkpoint . --task "1.1 First MVP slice" --status DONE --validation "passed"
npx --package create-sadl-project sadl dashboard .
```

For a SaaS prototype:

```bash
npx --package create-sadl-project sadl policy . --apply startup-saas
npx --package create-sadl-project sadl ci .
```

For parallel agent work:

```bash
npx --package create-sadl-project sadl branch . --task "1.2 Auth UI"
npx --package create-sadl-project sadl worktree . --task "1.3 Billing webhook" --dir ../billing-webhook
```

For assistant-specific setup:

```bash
npx --package create-sadl-project sadl adapter . --tool claude-code
npx --package create-sadl-project sadl adapter . --tool cursor
npx --package create-sadl-project sadl adapter . --tool github-copilot
```

## Current Capability Boundary

Implemented in the current development branch:

- repo template and CLI
- intake wizard and JSON-backed intake
- PRD/spec/env generation from intake
- roadmap generation
- local schema validation for SADL config and session logs
- configured validation command runner
- branch/worktree helpers
- GitHub Action generation
- static dashboard generation
- policy packs
- adapter file generation
- improved dream analytics

Planned but not implemented yet:

- full MCP server
- native IDE extensions
- hosted dashboard
- true model routing
- live token/usage watcher
- automatic AI session launch/resume
- automatic complex merge conflict resolution
- autonomous production deploys

## Publishing To npm

You need an npm account and a package name that is available.

1. Create or log into your npm account:

```bash
npm login
```

2. Check the package name:

```bash
npm view create-sadl-project
```

If the name is taken, change `package.json` to a scoped name:

```json
{
  "name": "@your-scope/create-sadl-project"
}
```

Then users will run:

```bash
npx @your-scope/create-sadl-project my-app
```

3. Test packaging locally:

```bash
npm pack --dry-run
```

4. Publish:

For the stable package:

```bash
npm publish --otp YOUR_OTP
```

For a prerelease such as `0.2.0-next.0`, use the `next` tag so it does not replace stable `latest`:

```bash
npm publish --tag next --otp YOUR_OTP
```

For a scoped public package:

```bash
npm publish --access public
```

5. Verify:

```bash
npx create-sadl-project test-sadl-app
```

or, for scoped packages:

```bash
npx @your-scope/create-sadl-project test-sadl-app
```

## Pushing To GitHub Or Another Git Remote

Initialize and commit:

```bash
git init
git add AGENTS.md .sadl docs src tests .env.example .gitignore
git commit -m "Initial SADL Kit MVP"
```

Create an empty repository on GitHub/GitLab/Bitbucket, then add the remote:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

If you use SSH:

```bash
git remote add origin git@github.com:YOUR_USER/YOUR_REPO.git
git push -u origin main
```

## Best Known Methods

- Keep the PRD focused on product intent, not implementation detail.
- Put technical rules in `docs/04_ARCH_SPEC.md`.
- Keep `docs/03_STATE.md` short and current.
- Keep historical detail in `docs/05_SESSION_LOG.md` and `docs/session_logs/*.json`.
- Use small roadmap tasks that can be completed, validated, checkpointed, and committed in one session.
- Never let two agents edit the same file in parallel.
- Use one branch or worktree per parallel agent.
- Let agents know secret names only through `.env.example` and `docs/setup-env.md`.
- Do not paste secret values into chat.
- Treat generated rule changes from `sadl dream` as proposals only.
- Require human approval for architecture changes, production deploys, protected file edits, and merge conflicts.
- Do not mark roadmap items `DONE` unless validation passes.
- If approval is required, checkpoint as `WAITING_FOR_APPROVAL` and stop.
- If a search, test, or debug loop repeats without progress, checkpoint as `BLOCKED_WITH_STATE`.

## Real-Life Scenario

You want to build a subscription-based field-service scheduling SaaS.

The product needs:

- company accounts
- technicians
- customers
- job scheduling
- calendar view
- Stripe billing
- email notifications
- admin dashboard
- audit logs

With normal AI coding, one assistant may build the UI, another may later forget the database schema, a third may duplicate auth logic, and nobody has a clean record of what was done.

With SADL:

1. You run:

```bash
npx create-sadl-project field-service-saas
cd field-service-saas
```

2. You fill `docs/01_PRD.md` with product intent, user roles, workflows, non-goals, and acceptance criteria.

3. You fill `docs/04_ARCH_SPEC.md`:

```text
Framework: Next.js
Database: PostgreSQL
Auth: email/password plus invite flow
Payments: Stripe
Validation: npm run lint, npm test, npm run build
```

4. You document only secret names:

```text
DATABASE_URL
AUTH_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
EMAIL_API_KEY
```

5. A planner agent creates `docs/02_ROADMAP.md`:

```text
1.1 Bootstrap app shell
1.2 Define database schema
1.3 Implement auth
1.4 Implement customer CRUD
1.5 Implement technician scheduling
1.6 Implement Stripe checkout
1.7 Implement Stripe webhook
1.8 Add audit logs
1.9 Add integration tests
```

6. You approve the roadmap.

7. A coding agent starts task `1.1`, validates, checkpoints, and commits.

8. Later, Claude, Codex, Cursor, Gemini, or another assistant can continue from Git by reading:

```text
AGENTS.md
docs/03_STATE.md
docs/02_ROADMAP.md
docs/04_ARCH_SPEC.md
```

9. If an agent gets stuck on Stripe webhooks, it writes:

```text
Task Status: BLOCKED - 1.7 Implement Stripe webhook
Current Blocker: Local webhook signing secret not configured.
Next Exact Action: User must configure STRIPE_WEBHOOK_SECRET locally, then rerun webhook test.
```

10. The next agent resumes without guessing.

That is SADL's core benefit: the project keeps its memory, not the chat window.

## What SADL Does Better Than Existing Tools

Existing tools provide pieces: project rules, memories, background agents, PRs, specs, or IDE integrations. SADL's value is that the operating protocol is stored in the repository and remains usable across tools.

SADL improves:

- Cross-model handoff.
- Cross-IDE portability.
- Session accountability.
- Secret isolation.
- Reduced context waste.
- Safer multi-agent work.
- Reviewable self-improvement.

SADL does not replace Codex, Claude Code, Cursor, Kiro, Gemini, GitHub Copilot, Devin, CI, GitHub, or human review. It gives them a shared operating layer.

## Similar Products And Adjacent Tools

SADL overlaps with, but does not replace:

- AGENTS.md: a common file convention for coding-agent instructions.
- GitHub Spec Kit: spec-driven development focused on turning specs into implementation plans.
- Kiro: an agentic IDE with specs, steering, hooks, and MCP support.
- OpenAI Codex: a coding agent that can work in local/cloud environments and use repository instructions.
- Claude Code: a coding agent with project memory, hooks, and subagents.
- Cursor: an AI IDE with rules, memories, and background agents.
- GitHub Copilot coding agent: a GitHub-native background coding agent that opens PRs.
- Devin: an autonomous software engineering agent with knowledge/session features.

SADL's niche is the portable lifecycle layer across those tools: PRD, architecture spec, roadmap, state, checkpoints, validation, policy packs, and session logs stored in the repository.

## Project Maturity Profiles

Use the smallest profile that fits:

- `lite`: solo or small project. Core docs and config.
- `standard`: production app. Adds architecture, validation, logs, secret safety.
- `enterprise`: teams, monorepos, regulated work. Adds stricter logs, manifests, multi-agent ownership, policy gates.
