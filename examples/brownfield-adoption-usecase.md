# Example: Existing Repository Adoption

## Goal

Add SADL to a repository that already has source code and tests.

## Commands

```bash
cd existing-project
sadl adopt . --profile standard
sadl validate .
```

## First Human Tasks

1. Fill `docs/01_PRD.md` with the current product intent.
2. Fill `docs/04_ARCH_SPEC.md` with the current stack and boundaries.
3. Update `.sadl.config.json` with real validation commands.
4. Add required env var names to `.env.example`.
5. Run `sadl manifest .`.

## First Agent Task

```text
Use SADL. Audit the existing repo against docs/01_PRD.md and docs/04_ARCH_SPEC.md.
Do not refactor. Produce a proposed docs/02_ROADMAP.md with small tasks and mark it NEEDS_REVIEW.
```

