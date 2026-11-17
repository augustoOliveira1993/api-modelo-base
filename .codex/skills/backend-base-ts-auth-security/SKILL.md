---
name: backend-base-ts-auth-security
description: |
  Use this skill when implementing or changing authentication, authorization, session handling, and security-sensitive behavior in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-auth-security
  - auth-security
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - auth
  - security
---

# Backend Base TS - Auth Security

Use this skill when implementing or changing authentication, authorization, session handling, and security-sensitive behavior in backend-base-ts.

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

# Backend Base TS Auth Security

## Objective
Guarantee secure auth flows and policy-consistent access control.

## Rules

- Keep authentication and authorization centralized in shared middleware and module services.
- Enforce least privilege with explicit role checks.
- Validate tokens and session state consistently.
- Never expose sensitive internals in error payloads.

## Implementation checklist

- Auth middleware remains in shared middlewares.
- Route protection uses explicit authorization policy.
- Session lifecycle changes include invalidation strategy.
- Security-sensitive changes include regression tests.

## Security hardening checks

- Input validation in all auth-sensitive endpoints.
- No plaintext credential handling beyond strict necessity.
- Rate limiting considered for brute-force vectors.
- Audit logging for relevant security events.

