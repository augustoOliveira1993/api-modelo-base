---
name: backend-base-ts-data-access
description: |
  Use this skill when changing repositories, database adapters, or data query behavior in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-data-access
  - data-access
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - data
  - access
---

# Backend Base TS - Data Access

Use this skill when changing repositories, database adapters, or data query behavior in backend-base-ts.

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

# Backend Base TS Data Access

## Objective
Ensure data access remains contract-driven, testable, and implementation-agnostic.

## Rules

- Define or update repository interfaces first.
- Keep ORM or driver details inside infra implementations.
- Return domain-safe shapes from repository methods.
- Handle pagination, filtering, and sorting predictably.

## Implementation checklist

- Interface updated in module contract layer.
- Infra repository implementation updated accordingly.
- Service usage updated without leaking data layer details.
- Query-level behavior documented when externally visible.

## Data safety checks

- Validate null and not found paths.
- Ensure unique constraints and conflict handling are explicit.
- Ensure transactional behavior when operation spans multiple writes.

## Performance checks

- Avoid N+1 query patterns.
- Ensure indexed filters for hot paths when applicable.
- Avoid over-fetching fields in list endpoints.

