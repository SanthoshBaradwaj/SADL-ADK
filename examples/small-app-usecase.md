# Example: Small App

## Goal

Build a personal habit tracker with local auth, a dashboard, and daily check-ins.

## Commands

```bash
sadl init habit-tracker --profile lite
cd habit-tracker
```

## PRD Summary

```text
Product intent:
Users track habits daily and see streaks.

MVP:
- Create account.
- Add habits.
- Mark habit complete for today.
- Show current streak.

Non-goals:
- Social sharing.
- Payments.
- Native mobile app.

Acceptance criteria:
- User can add, edit, delete habits.
- User can mark a habit complete for a day.
- Dashboard shows streak and completion rate.
```

## Secrets

```text
DATABASE_URL
AUTH_SECRET
```

## Validation

```text
npm run lint
npm test
npm run build
```

## Agent Start Prompt

```text
Use SADL. Generate the first micro-task roadmap from the PRD and architecture spec. Stop after updating docs/02_ROADMAP.md for human approval.
```

