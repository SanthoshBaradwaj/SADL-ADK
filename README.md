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
- Machine-readable config and session logs.
- Secret-safe defaults.
- Multi-agent and model-switch rules.
- Review-only `dream` pass that finds repeated waste or blockers from session logs.
- Adapter notes for Codex, Claude Code, Cursor, Kiro, Gemini, GitHub Copilot coding agent, and generic CLI agents.

## Repository Layout

```text
sadl-kit/
├── bin/                       # CLI entry points
├── src/                       # CLI implementation
├── templates/project/         # SADL project skeleton
├── schemas/                   # JSON schemas
├── adapters/                  # Tool-specific usage notes
├── docs/                      # Product docs and BKMs
├── examples/                  # Real usage examples
└── tests/                     # CLI tests
```

A generated SADL project contains:

```text
project-root/
├── AGENTS.md                  # Primary agent operating rules
├── .agent_rules.md            # Compatibility alias for agents that expect it
├── .sadl.config.json          # Host policy, validation, token, model, secret rules
├── .sadl_manifest.json        # Generated hash manifest
├── .env.example               # Secret names only, never values
├── docs/
│   ├── 01_PRD.md              # Product intent
│   ├── 02_ROADMAP.md          # Task ledger
│   ├── 03_STATE.md            # Latest handoff
│   ├── 04_ARCH_SPEC.md        # Technical boundaries
│   ├── 05_SESSION_LOG.md      # Human-readable session receipts
│   ├── setup-env.md           # Environment variable setup by name
│   ├── decisions/             # Proposed ADRs
│   └── session_logs/          # Machine-readable JSON receipts
├── src/
└── tests/
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

## Intended Published Usage

After publishing to npm:

```bash
npx create-sadl-project my-app
cd my-app
sadl validate .
sadl start .
```

For an existing repository:

```bash
cd existing-project
sadl adopt .
sadl validate .
```

## Core Commands

```bash
sadl init [path]          # Create SADL files in a new project
sadl adopt [path]         # Add SADL files to an existing project
sadl intake               # Print structured intake questions
sadl start [path]         # Show agent bootstrap instructions
sadl status [path]        # Show active task, state, git, validation summary
sadl validate [path]      # Check required files, state, secrets, manifest
sadl manifest [path]      # Generate file hash manifest
sadl checkpoint [path]    # Update state and append session logs
sadl dream [path]         # Analyze session logs and propose improvements
sadl commit [path]        # Validate, git add, and git commit
```

## How To Use SADL For A New App

1. Create the project shell:

```bash
npx create-sadl-project my-app
cd my-app
```

2. Fill the required planning files:

```text
docs/01_PRD.md
docs/04_ARCH_SPEC.md
.sadl.config.json
.env.example
docs/setup-env.md
```

3. Validate readiness:

```bash
sadl validate . --strict
```

4. Ask an AI assistant to generate the roadmap:

```text
Use SADL.
Read AGENTS.md, .sadl.config.json, docs/01_PRD.md, and docs/04_ARCH_SPEC.md.
Generate granular tasks in docs/02_ROADMAP.md.
Do not implement yet.
Mark the roadmap NEEDS_REVIEW for human approval.
```

5. Approve the roadmap, then start implementation:

```text
Use SADL.
Continue the active roadmap task.
Work only on that task.
Validate using .sadl.config.json.
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

## How To Use SADL With Any AI Coding Assistant

Paste this as the starting instruction:

```text
Use SADL for this repository.
Follow AGENTS.md exactly.
Read .sadl.config.json, docs/03_STATE.md, and the active item in docs/02_ROADMAP.md before editing.
Read docs/04_ARCH_SPEC.md for technical constraints.
Do not read .env files or request secret values.
Work only on the active roadmap task.
If the task is too large, split it in docs/02_ROADMAP.md and stop for approval.
Run validation commands from .sadl.config.json.
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
sadl commit . --message "sadl: complete auth UI shell"
```

The commit command runs SADL validation first and refuses to commit when hard failures are present.

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

```bash
npm publish
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
git add -A
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

## Project Maturity Profiles

Use the smallest profile that fits:

- `lite`: solo or small project. Core docs and config.
- `standard`: production app. Adds architecture, validation, logs, secret safety.
- `enterprise`: teams, monorepos, regulated work. Adds stricter logs, manifests, multi-agent ownership, policy gates.

