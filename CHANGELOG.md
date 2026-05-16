# Changelog

## Unreleased

- Added machine-readable `docs/03_STATE.md` frontmatter and checkpoint-to-runtime synchronization for deterministic handoffs.
- Added strict validation warnings/failures for missing or desynced handoff frontmatter.
- Added traceable roadmap planning with `TASK-*` IDs, requirement links, default allowed paths, and task metadata in `.sadl/traceability.json`.
- Added `sadl trace` to report requirement/task/evidence coverage.
- Added checkpoint evidence updates for traceable tasks.
- Added `sadl prd-check` for PRD sufficiency scoring, vague-word warnings, requirement ID proposals, and PRD/traceability sync-locking.
- Added validation failure when an already sync-locked PRD changes without refreshing `.sadl/traceability.json`.
- Added security hardening for configured command execution: command approval gates, local command fingerprints, `--yes`, `--trust-command`, and `--unsafe-shell`.
- Replaced broad `sadl commit` staging with explicit path-based commits for non-interactive use.
- Added an npm package `files` whitelist, pinned generated CI to the current package version, and documented trust boundaries in `SECURITY.md`.
- Added the new `.sadl/` state foundation with committed config/traceability files and local-only runtime, approvals, and telemetry files.
- Added `sadl migrate` for older projects and expanded doctor/validation checks for the new machine-readable state.
- Added JSON schemas for config, traceability, runtime, approvals, and telemetry state.
- Updated docs and adapters to prefer `.sadl/config.json` while keeping `.sadl.config.json` as a legacy compatibility path.
- Updated README and usage docs for the promoted npm dist-tags.
- Documented PRD intake modes, AI workflow configuration, supported assistants, and current handoff boundaries.

## 0.2.0-next.0

- Added interactive and JSON-backed `sadl intake` file generation.
- Added `sadl plan` roadmap generation.
- Added local JSON schema validation for SADL config and session logs.
- Added configured validation command runner via `sadl run` and `sadl validate --run`.
- Added task branch and worktree helpers.
- Added GitHub Action generation with `sadl ci`.
- Added static dashboard generation with `sadl dashboard`.
- Added policy packs for solo, startup SaaS, enterprise, open source, and monorepo usage.
- Added adapter file generation for common AI coding assistants.
- Improved `sadl dream` analytics.
- Added prototyping guide and MCP server plan.
- Added diagnostic audit documentation for implemented and planned boundaries.

## 0.1.1

- Updated README for published npm usage.
- Replaced non-ASCII tree diagrams with ASCII-safe formatting.
- Added a detailed future product roadmap.

## 0.1.0

- Initial SADL Kit MVP.
- Added repo template, CLI, schemas, docs, adapters, examples, and tests.
