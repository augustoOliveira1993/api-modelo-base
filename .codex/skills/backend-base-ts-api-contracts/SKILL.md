---
name: backend-base-ts-api-contracts
description: |
  Use this skill when changing DTOs, request validation, response shapes, route semantics, or API behavior in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-api-contracts
  - api-contracts
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - api
  - contracts
---

# Backend Base TS - Api Contracts

Use this skill when changing DTOs, request validation, response shapes, route semantics, or API behavior in backend-base-ts.

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

# Backend Base TS API Contracts

## Objective
Keep API contracts explicit, version-safe, and aligned with service behavior.

## Rules

- Define DTOs for every non-trivial request and response.
- Validate input consistently.
- Keep response shape stable unless change is intentional.
- Use proper HTTP status code semantics.

## Contract change process

1. Update DTOs.
2. Update controller mapping.
3. Update service expectations.
4. Update tests covering API behavior.
5. Update docs that describe route contracts.

## Checklist before completion

- Required and optional fields are clear.
- Error responses follow project conventions.
- Search, pagination, and filters are deterministic.
- Breaking changes are documented explicitly.

