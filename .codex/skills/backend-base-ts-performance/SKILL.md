---
name: backend-base-ts-performance
description: |
  Use this skill when addressing scalability, latency, throughput, caching, or efficiency concerns in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-performance
  - performance
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - performance
---

# Backend Base TS - Performance

Use this skill when addressing scalability, latency, throughput, caching, or efficiency concerns in backend-base-ts.

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

# Backend Base TS Performance

## Objective
Improve performance without sacrificing architecture clarity or correctness.

## Rules

- Optimize after identifying the real bottleneck.
- Keep performance concerns in services, repositories, and shared infra, not controllers.
- Prefer measurable improvements over speculative tuning.

## Performance checklist

- Query patterns reviewed for hot paths.
- Caching strategy is explicit and invalidation-safe.
- Pagination defaults are sensible for list endpoints.
- Expensive operations avoid redundant work.

## Validation

- Compare before and after behavior where possible.
- Ensure no contract or security regression from optimization.
- Document tradeoffs for non-obvious optimization decisions.

