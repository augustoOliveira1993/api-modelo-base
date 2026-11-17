---
name: backend-base-ts-observability
description: |
  Use this skill when implementing logs, metrics, request tracing, route monitoring, or production diagnostics in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-observability
  - observability
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - observability
---

# Backend Base TS - Observability

Use this skill when implementing logs, metrics, request tracing, route monitoring, or production diagnostics in backend-base-ts.

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

# Backend Base TS Observability

## Objective
Keep operational visibility high without polluting domain logic.

## Rules

- Observability belongs to shared infra and middleware boundaries.
- Use structured logs and include correlation context when available.
- Keep route-level monitoring and metrics consistent.
- Avoid logging sensitive payload content.

## Implementation checklist

- Request identifier flow remains preserved.
- Critical operations produce useful, searchable logs.
- New hot routes include monitoring hooks when relevant.
- Metrics naming follows a consistent pattern.

## Acceptance checks

- Failures are diagnosable through logs.
- Success path telemetry does not create excessive noise.
- Monitoring additions do not alter business behavior.

