# 04_ARCH_SPEC.md: Architecture Specification

## Status
[USER ACTION REQUIRED] Complete this document before implementation begins.

## 1. Technical Stack
- Language/runtime:
- Framework:
- Package manager:
- Database/storage:
- Deployment target:
- Test framework:

## 2. Architecture Boundaries
Describe the major layers and allowed dependencies between them.

- UI/presentation:
- Domain/business logic:
- Data access:
- External services:
- Tests:

## 3. Coding Standards
- Typing rules:
- Formatting/linting:
- Error handling:
- Logging:
- Accessibility:
- Internationalization:

## 4. Data Model
Document entities, schemas, migrations, and ownership rules.

## 5. Security Rules
- Authentication:
- Authorization:
- Secret handling:
- Input validation:
- Audit logging:

## 6. Validation Commands
These commands should also be mirrored in `.sadl/config.json`.

```text
lint:
test:
typecheck:
build:
```

## 7. Integration Contracts
List external APIs, rate limits, webhooks, retries, and failure behavior.

## 8. Architecture Decision Records
Architecture changes must be proposed as `docs/decisions/ADR-XXXX-title.md` and approved by a human before implementation.
