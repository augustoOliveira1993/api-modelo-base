---
name: backend-base-ts-testing-quality
description: |
  Use this skill when validating feature changes, fixing regressions, or enforcing quality gates in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-testing-quality
  - testing-quality
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - testing
  - quality
---

# Backend Base TS - Testing Quality

Use this skill when validating feature changes, fixing regressions, or enforcing quality gates in backend-base-ts.

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

# Backend Base TS Testing Quality

## Objective
Reduce regressions with stable, targeted, and behavior-focused validation.

## Test strategy

- Unit tests for service-level business rules.
- Middleware tests for access and request behavior.
- Contract and route tests for API shape changes.

## Mandatory quality gate

Run:

```bash
npm run lint
npm run build
npm run test
```

## Coverage expectations

- Happy path covered for new behavior.
- Key error path covered for new behavior.
- Security-sensitive flows include negative tests.

## Output policy

- If tests are not added, explain why risk is low.
- If tests cannot run, report exact blocker and impacted scope.

