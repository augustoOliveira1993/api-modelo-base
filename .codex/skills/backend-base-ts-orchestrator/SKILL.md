---
name: backend-base-ts-orchestrator
description: |
  Use this skill for any implementation task in backend-base-ts to enforce the standard execution pipeline and call specialized skills in the right order.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-orchestrator
  - orchestrator
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - orchestrator
---

# Backend Base TS - Orchestrator

Use this skill for any implementation task in backend-base-ts to enforce the standard execution pipeline and call specialized skills in the right order.

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

# Backend Base TS Orchestrator

## Objective
Make every task follow a repeatable backend delivery pipeline with architecture safety and quality gates.

## Always run this sequence

1. Context sync
- Read architecture and development docs.
- Confirm impacted modules and shared layers.

2. Plan by layer
- Define changes in route, controller, service, repository, dto, and infra.
- Identify DI container and route aggregator updates.

3. Implement with boundaries
- Keep business logic in service layer.
- Keep persistence logic in repository implementations.
- Keep cross-cutting concerns in shared.

4. Validate
- Run lint, build, tests.
- Validate route registration and dependency injection wiring.

5. Final check
- Ensure docs updated for contract changes.
- Ensure test coverage for behavior changes.

## Delegate to specialized skills

- backend-base-ts-architecture for architecture decisions and boundaries.
- backend-base-ts-module-development for feature and CRUD module work.
- backend-base-ts-data-access for repository and persistence work.
- backend-base-ts-api-contracts for DTOs, validation, and route contracts.
- backend-base-ts-auth-security for auth, roles, session, and secure flows.
- backend-base-ts-testing-quality for quality gates and regression checks.
- backend-base-ts-observability for logs, metrics, tracing, and monitorability.
- backend-base-ts-performance for scalability and performance optimizations.
- backend-base-ts-docs-maintenance for docs and changelog consistency.

## Hard stops

- Do not merge code with missing DI registration.
- Do not add direct infra calls in controllers.
- Do not bypass repository contracts.
- Do not change API contracts without docs and validation updates.

