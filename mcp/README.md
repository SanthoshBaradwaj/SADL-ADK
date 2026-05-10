# SADL MCP Server Plan

The MCP server is intentionally not implemented yet. The current CLI remains the host adapter because it works in any IDE or terminal.

## Planned MCP Capabilities

- Expose SADL project status as resources.
- Expose active roadmap task and latest state as resources.
- Provide tools for:
  - `sadl_validate`
  - `sadl_checkpoint`
  - `sadl_status`
  - `sadl_dashboard_data`
  - `sadl_policy_apply`
- Enforce secret-file blocking at the tool layer.
- Return structured session receipts for host dashboards.

## Non-Goals

- Replacing the CLI.
- Storing secret values.
- Routing between models.
- Allowing agents to rewrite SADL guardrails without approval.
