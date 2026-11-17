---
name: backend-base-ts-docs-maintenance
description: |
  Use this skill when implementation changes require updates to architecture docs, guides, or operational documentation in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-docs-maintenance
  - docs-maintenance
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - docs
  - maintenance
---

# Backend Base TS - Docs Maintenance

Use this skill when implementation changes require updates to architecture docs, guides, or operational documentation in backend-base-ts.

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

# Backend Base TS Docs Maintenance

## Objective
Keep project documentation aligned with actual behavior and architecture.

## Update triggers

- Route contract changed.
- Auth or role behavior changed.
- Session or cache strategy changed.
- New module or infrastructure convention introduced.

## Documentation checklist

- Update relevant file in docs folder.
- Keep examples aligned with current API behavior.
- Record migration notes when backward compatibility is affected.
- Update readme guidance if developer workflow changed.

## Quality rules

- Prefer concise, actionable docs.
- Keep command examples runnable.
- Remove stale statements instead of layering conflicting notes.

