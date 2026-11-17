# Backend Base TS Skills Catalog

This repository ships a mandatory skill set for consistent backend implementation.

## Mandatory entrypoint

- backend-base-ts-template
- backend-base-ts-orchestrator

Start every non-trivial task by applying these two skills first.

## Specialized skills

- backend-base-ts-architecture
- backend-base-ts-module-development
- backend-base-ts-data-access
- backend-base-ts-api-contracts
- backend-base-ts-auth-security
- backend-base-ts-testing-quality
- backend-base-ts-observability
- backend-base-ts-performance
- backend-base-ts-docs-maintenance

## Doc-based skills (1:1 from docs)

- backend-base-ts-doc-architecture
- backend-base-ts-doc-auth-routes-guide
- backend-base-ts-doc-changelog-improvements
- backend-base-ts-doc-como-trocar-repository-tsyringe
- backend-base-ts-doc-development-guide
- backend-base-ts-doc-implementation-summary
- backend-base-ts-doc-log-enums-guide
- backend-base-ts-doc-notification-cache-examples
- backend-base-ts-doc-readme
- backend-base-ts-doc-redis-cache-guide
- backend-base-ts-doc-role-unique-session-changes
- backend-base-ts-doc-scalability-and-template-improvements
- backend-base-ts-doc-session-mongodb-migration
- backend-base-ts-doc-template-presets

## Recommended usage order

1. backend-base-ts-template
2. backend-base-ts-orchestrator
3. backend-base-ts-architecture
4. backend-base-ts-module-development
5. Domain-specific skills needed by the task
6. backend-base-ts-testing-quality
7. backend-base-ts-docs-maintenance
8. Select the matching doc-based skill when the task maps to a specific docs file

## Default completion gate

Run before closing work:

```bash
npm run lint
npm run build
npm run test
```
