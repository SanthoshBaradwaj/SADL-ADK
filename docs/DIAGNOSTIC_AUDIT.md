# SADL Diagnostic Audit

This audit records the current implementation boundary for `0.2.0-next.0`.

## Verified Flows

- `sadl init`: creates the SADL project skeleton.
- `create-sadl-project`: delegates to `sadl init`.
- `sadl validate`: checks required files, config shape, secret safety, state, roadmap, manifest, protected-file changes, and session log schemas.
- `sadl intake --from-json`: writes PRD, architecture spec, `.env.example`, setup docs, and config validation commands from structured input.
- `sadl intake --write`: interactive wizard for the same generated files.
- `sadl plan --write`: creates a first roadmap with a human approval gate.
- `sadl run`: executes configured validation commands after approval, `--yes`, or a matching local command fingerprint.
- `sadl checkpoint`: writes current state and session logs.
- `sadl dream`: analyzes session logs for repeated commands, blockers, status distribution, approval wait, and failed sessions.
- `sadl dashboard`: generates a local static HTML dashboard.
- `sadl policy`: lists and applies versioned policy packs.
- `sadl adapter`: writes assistant-specific instruction files without replacing the core SADL protocol.
- `sadl ci`: generates a GitHub Action for SADL validation.

## Intentionally Limited

- JSON schema validation is local and lightweight. It covers the schema constructs used by SADL schemas, not the full JSON Schema specification.
- `sadl plan` is deterministic and simple. It creates a starter roadmap from PRD bullets; it does not replace human or AI planning.
- Loop detection is currently retrospective through `sadl dream` and validation command timeouts. Full live command-loop prevention is future host work.
- The dashboard is static HTML. There is no hosted service.
- Adapter generation creates instruction files. It is not a native IDE extension.
- MCP integration is documented as a plan only. No MCP server is implemented yet.

## Over-Engineering Guardrails

- Small projects can use the `solo` policy pack and avoid enterprise controls.
- All advanced features are opt-in commands.
- The core project still works with Markdown, JSON, Git, and Node built-ins only.
- Policy packs add config defaults; they do not create hidden behavior.
- `sadl dream` writes review-only reports and does not mutate rules automatically.

## Release Candidate

Current local release candidate:

```text
create-sadl-project@0.2.0-next.0
```

Recommended publish command:

```bash
npm publish --tag next --otp YOUR_OTP
```
