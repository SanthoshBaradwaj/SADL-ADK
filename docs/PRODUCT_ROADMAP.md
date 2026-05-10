# SADL Product Roadmap

This roadmap captures the planned direction after the `0.1.x` MVP. SADL should remain lean: every feature must improve handoff quality, reduce wasted agent work, improve safety, or make the protocol easier to adopt across tools.

## Product Principles

- Keep the repository as the source of truth.
- Keep the CLI dependency-light and usable in any IDE or terminal.
- Prefer open, portable files over vendor-specific memory.
- Treat self-improvement as reviewable proposals, not hidden agent mutation.
- Keep small projects simple and let heavier controls activate only when needed.

## 0.1.x: Stabilize The Public MVP

- Keep npm package metadata and README current.
- Add smoke tests for `npx create-sadl-project`.
- Add tests that generated projects contain `.gitignore`, `.env.example`, SADL docs, and config.
- Improve Windows, macOS, and Linux path handling.
- Add `sadl version`.
- Add `sadl doctor` alias coverage in tests.
- Add examples for:
  - solo app
  - existing repo adoption
  - monorepo adoption
  - multi-agent branch workflow

## 0.2.x: Intake And Planning

- Replace printed `sadl intake` questions with an interactive wizard.
- Generate `docs/01_PRD.md` from structured answers.
- Generate `docs/04_ARCH_SPEC.md` from stack and architecture choices.
- Generate `.env.example` and `docs/setup-env.md` from secret names only.
- Add required-field validation for PRD readiness.
- Add `sadl plan` to create a granular roadmap from approved PRD/spec inputs.
- Add a human approval marker before implementation begins.

## 0.3.x: Validation Runner

- Execute configured lint, test, typecheck, and build commands from `.sadl.config.json`.
- Record validation results into session logs.
- Add command timeout handling.
- Add repeated-command loop detection.
- Add failed-test retry budget.
- Add `sadl validate --strict` rules for:
  - unresolved PRD placeholders
  - missing validation commands
  - unsafe secret files
  - stale state
  - protected file modifications

## 0.4.x: Git And Session Automation

- Add `sadl branch task-id` to create task branches.
- Add `sadl worktree task-id` for parallel agent work.
- Add `sadl finish` to validate, checkpoint, and commit in one flow.
- Add dirty-file ownership checks.
- Add protected-path enforcement before commit.
- Add commit message templates with task IDs and validation evidence.
- Add changelog/session summary generation.

## 0.5.x: Multi-Agent Orchestration

- Add a coordinator mode for assigning task/file ownership.
- Add worker manifests for parallel agents.
- Add conflict prevention for same-file edits.
- Add merge-readiness checks.
- Add reviewer role prompts.
- Add security-review role prompts.
- Add explicit model-switch checkpoints.

## 0.6.x: Adapter Generators

- Generate tool-specific config or instruction files for:
  - Codex
  - Claude Code
  - Cursor
  - Kiro
  - Gemini-based CLI agents
  - GitHub Copilot coding agent
  - generic CLI agents
- Keep `AGENTS.md` as the canonical source and generate adapters from it.
- Add drift detection when adapter instructions diverge from SADL rules.

## 0.7.x: CI And Policy

- Add GitHub Action for `sadl validate`.
- Add pre-commit hook templates.
- Add policy packs:
  - solo project
  - startup SaaS
  - enterprise regulated app
  - open-source library
  - monorepo
- Add secret-scanning guidance and optional integration hooks.
- Add architecture decision record validation.

## 0.8.x: Reflection And Dreaming

- Improve `sadl dream` from a static report into a structured analysis pass.
- Detect repeated blockers across session logs.
- Detect repeated command waste.
- Detect recurring test failures and unclear architecture rules.
- Propose updates to:
  - `AGENTS.md`
  - `docs/04_ARCH_SPEC.md`
  - `.sadl.config.json`
  - `docs/02_ROADMAP.md`
- Require human approval before applying any proposed rule or architecture change.

## 0.9.x: Dashboard And Observability

- Add `sadl status --dashboard-data` for UI consumers.
- Track session outcomes:
  - done
  - blocked
  - failed tests
  - waiting for approval
  - abandoned
- Track estimated cost and token metadata when the host provides it.
- Track time waiting on human approval.
- Track rework rate and validation pass rate.
- Add static HTML report generation.

## 1.0.0: Stable Protocol

- Freeze versioned SADL file contracts.
- Publish stable schemas.
- Provide migration tooling for older SADL projects.
- Document compatibility guarantees.
- Provide complete examples for small, standard, and enterprise projects.
- Ensure CLI behavior is stable enough for CI usage.

## Future Enterprise Scope

- Hosted team dashboard.
- Organization policy management.
- Enterprise audit exports.
- Role-based access controls.
- Centralized agent/session analytics.
- Integration with issue trackers and project-management systems.
- Private policy packs and internal best-known-method libraries.

## Explicitly Not Planned For Core

- Replacing AI coding assistants.
- Replacing Git, CI, or human code review.
- Storing secret values.
- Autonomous production deployment by default.
- Silent self-modifying agent rules.
- Automatic resolution of complex merge conflicts.
- Vendor-specific lock-in as a requirement.

