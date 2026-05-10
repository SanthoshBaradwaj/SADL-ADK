# Example Agent Session

## Human

```text
Use SADL. Continue the active task.
```

## Agent Pre-Flight

```text
Read AGENTS.md.
Read .sadl.config.json.
Read docs/03_STATE.md.
Read active item in docs/02_ROADMAP.md.
Read relevant architecture section.
```

## Agent Work

```text
Implement task 1.1.
Run configured tests.
Update docs/02_ROADMAP.md state from WIP to DONE.
Run sadl checkpoint.
Run sadl commit if validation passes.
```

## Checkpoint Command

```bash
sadl checkpoint . \
  --task "1.1 Create auth UI shell" \
  --status DONE \
  --model "configured-coder" \
  --commands "npm test,npm run lint" \
  --validation "passed" \
  --next "Start 1.2 Implement auth API route"
```

