---
name: backend-base-ts-template
description: |
  Use this skill as the mandatory baseline when working in backend-base-ts to keep architecture, module boundaries, and quality gates consistent.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-template
  - template
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - template
---

# Backend Base TS - Template

Use this skill as the mandatory baseline when working in backend-base-ts to keep architecture, module boundaries, and quality gates consistent.

## Quick Start

1. Read the existing implementation and impacted module boundaries.
2. Apply this skill guidance before editing code.
3. Validate with lint, build, and tests before finishing.

## When to Use This Skill

- When the task scope matches this skill name and domain.
- When reviewing or implementing related backend changes.
- When enforcing repository conventions for this topic.

## Project Setup Checklist

- [ ] Keep module and shared boundaries intact.
- [ ] Keep controllers thin and service-driven.
- [ ] Keep DI wiring and route aggregation correct.
- [ ] Update docs when contracts or behavior change.
- [ ] Run: npm run lint, npm run build, npm run test.

## Reference Guidance

# Backend Base TS Template

## Objective
Preserve repository standards and enforce a predictable modular backend flow for every task.

## Mandatory startup sequence
Before proposing changes, read:

- docs/ARCHITECTURE.md
- docs/DEVELOPMENT_GUIDE.md
- docs/SCALABILITY_AND_TEMPLATE_IMPROVEMENTS.md
- docs/README.md
- package.json
- tsconfig.json
- src/shared/container/index.ts
- src/shared/infra/https/routes/index.ts

## Core rules

- Keep feature code inside src/modules/{module-name}.
- Keep reusable platform concerns inside src/shared.
- Preserve repository contracts and dependency inversion.
- Keep controllers thin and move business rules to services.
- Prefer one service class per action with execute().
- Resolve services through DI container, never manual wiring in controllers.
- Register module dependencies in module container and then in shared root container.
- Register module routes in the shared route aggregator.
- Use shared error standards and avoid leaking infra details into services.

## Naming and style

- Classes: PascalCase
- Interfaces: I + PascalCase
- Enums: E + PascalCase
- Methods and variables: camelCase
- DI tokens: PascalCase strings

## Required validation

Run before finalizing:

```bash
npm run lint
npm run build
npm run test
```

## Definition of done

- Module boundaries are respected.
- DI registration is complete.
- Routes are aggregated correctly.
- New dependency usage is justified.
- API contract changes include docs update.
- Behavior-changing work includes tests or explicit test gap note.

