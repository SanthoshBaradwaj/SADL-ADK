# Example: Full-Stack SaaS

## Goal

Build a subscription-based project collaboration app.

## Commands

```bash
sadl init collab-saas --profile standard
cd collab-saas
```

## Required SADL Inputs

```text
Product intent:
Teams create projects, invite members, assign work, and track completion.

Roles:
- Owner
- Admin
- Member
- Viewer

MVP:
- Email login.
- Workspace creation.
- Project board.
- Task assignment.
- Stripe subscription.
- Basic audit log.

Non-goals:
- Enterprise SSO in MVP.
- Native mobile app.
- Offline support.

Secrets by name:
- DATABASE_URL
- AUTH_SECRET
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- EMAIL_API_KEY
```

## Multi-Agent Split

```text
Planner: roadmap and ADRs.
Coder A: auth UI and session pages.
Coder B: workspace/project data model.
Coder C: Stripe webhook route.
Tester: integration tests.
Reviewer: final PR review.
```

Each worker uses a separate branch:

```text
sadl/task-001-auth
sadl/task-002-workspaces
sadl/task-003-stripe
```

