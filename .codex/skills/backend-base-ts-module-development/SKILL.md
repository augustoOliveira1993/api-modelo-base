---
name: backend-base-ts-module-development
description: |
  Use this skill for creating or evolving module features in backend-base-ts with the expected route-controller-service-repository-dto flow.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-module-development
  - module-development
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - module
  - development
---

# Backend Base TS - Module Development

Use this skill for creating or evolving module features in backend-base-ts with the expected route-controller-service-repository-dto flow.

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

# Backend Base TS Module Development

## Objective
Implement module features with consistent structure and low regression risk.

## Standard implementation flow

1. Define feature scope and affected module.
2. Add or update DTOs.
3. Implement or update service with execute().
4. Update repository contract and implementation.
5. Keep controller thin and map request to service input.
6. Register DI and route aggregation.
7. Add tests for behavior changes.

## Generator-first approach

- Prefer scripts for scaffolding when available.
- After generation, normalize naming and folder placement.

## Module quality gate

- One action per service class.
- DTO validation is explicit.
- No infra concern leakage to service layer.
- Route names and HTTP semantics are coherent.

## Output expectations

- New feature is discoverable in module routes.
- Dependencies are container-registered.
- Tests cover success and error paths.

