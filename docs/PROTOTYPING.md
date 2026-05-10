# Prototyping With SADL

SADL should make prototypes faster, not heavier. Use the smallest profile and only add stricter controls when the project starts to matter.

## Fastest Path

```bash
npx create-sadl-project@latest prototype-app
cd prototype-app
npx --package create-sadl-project@latest sadl intake . --write
npx --package create-sadl-project@latest sadl plan . --write
npx --package create-sadl-project@latest sadl policy . --apply solo
npx --package create-sadl-project@latest sadl validate .
```

For the `next` prerelease line:

```bash
npx create-sadl-project@next prototype-app
cd prototype-app
npx --package create-sadl-project@next sadl intake . --write
npx --package create-sadl-project@next sadl plan . --write
npx --package create-sadl-project@next sadl policy . --apply solo
npx --package create-sadl-project@next sadl validate .
```

Then give any AI coding assistant this prompt:

```text
Use SADL.
Follow AGENTS.md.
Read .sadl.config.json, docs/03_STATE.md, and docs/02_ROADMAP.md.
Work on the first TODO task only.
Validate, checkpoint, and commit if validation passes.
```

## Prototype Profiles

- `solo`: best for single-person experiments and weekend apps.
- `startup-saas`: best for MVPs with auth, billing, integrations, and CI.
- `open-source`: best for public libraries and community projects.
- `monorepo`: best when several packages/apps live in one repo.
- `enterprise`: best when auditability and approvals matter.

## BKM For Prototype Builders

- Start with fewer files and fewer rules.
- Keep the first PRD short but concrete.
- Put only 3-7 MVP tasks in the first roadmap.
- Use real validation commands as soon as possible.
- Do not let agents build payments, auth policy, or production deploys without approval.
- Keep secrets as names only in `.env.example`.
- Use `sadl dashboard .` after a few sessions to see blockers and repeated waste.

## When To Grow The Process

Move from `solo` to `startup-saas` when:

- users other than you will test it
- auth or billing appears
- external APIs appear
- multiple agents or humans work at once
- CI starts mattering

Move to `enterprise` when:

- regulated data is involved
- multiple teams touch the repo
- approvals are required
- audit trails are mandatory
