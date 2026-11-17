---
name: backend-base-ts-architecture
description: |
  Use this skill when designing or refactoring backend-base-ts structure to preserve module boundaries, dependency inversion, and shared infrastructure conventions.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-architecture
  - architecture
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - architecture
---

# Backend Base TS - Architecture

Use this skill when designing or refactoring backend-base-ts structure to preserve module boundaries, dependency inversion, and shared infrastructure conventions.

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

# Backend Base TS Architecture

## Objective
Protect architectural integrity and prevent layer leakage.

## Architectural model

- Modules in src/modules own domain features.
- Shared in src/shared owns cross-cutting and infrastructure.
- Controllers: transport and mapping only.
- Services: business rules and orchestration.
- Repositories: data access contracts and implementations.

## Rules

- Never move domain logic to controllers or middleware.
- Never couple services directly to framework-specific details.
- Never skip interfaces for repository dependencies.
- Keep module containers isolated, then aggregate in shared container.

## Change checklist

- Module folder structure remains coherent.
- Service dependencies are injected via tokens.
- New shared utilities are generic and reusable.
- Route registration remains centralized.
- Error handling follows project shared errors.

## Anti-patterns to reject

- Fat controllers.
- Service classes with multiple unrelated actions.
- Circular dependencies between modules.
- Direct database calls inside route/controller code.

