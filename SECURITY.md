# Security Policy

SADL is a repo-native control plane for AI coding workflows. It is not a sandbox, secret manager, or malware scanner. Treat commands from any repository the same way you would treat `npm test`, `make`, or a project script from an unfamiliar codebase.

## Trust Boundaries

- Installing the package does not run project code.
- `sadl run` and `sadl validate --run` execute commands from `.sadl/config.json` only after approval.
- Local command approvals live in `.sadl/approvals.json` and must not be committed.
- Runtime and token/cost telemetry live in local-only `.sadl/` files and must not be committed.
- Agents must never read, print, summarize, store, or commit `.env` values.

## Safe Usage

Before running configured project commands in a repository you did not author:

1. Review `.sadl/config.json`.
2. Review package scripts and lockfiles.
3. Run `sadl validate .` before `sadl validate . --run`.
4. Use `--yes` only in trusted CI or after reviewing the command.
5. Use `--trust-command` only for commands you are willing to approve locally until their fingerprint changes.

## Command Fingerprints

SADL fingerprints approved commands using the command string, working directory, active task, SADL version, config hash, package script hash, lockfile hash, and environment key names. If relevant project configuration changes, prior trust no longer applies.

## Commit Safety

`sadl commit` requires explicit paths in non-interactive use:

```bash
sadl commit . --paths src/auth.ts,tests/auth.test.ts --message "sadl: complete auth task"
```

SADL refuses to commit local runtime/trust files, `.env` files, private keys, and known secret-like paths.

## Reporting Vulnerabilities

Please report security issues privately to the repository owner before opening public issues with exploit details.

