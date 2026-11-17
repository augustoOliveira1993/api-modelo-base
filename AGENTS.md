# Agent Operating Rules for backend-base-ts

These rules are mandatory for any AI coding agent working in this repository.

## Always apply these skills first

1. .codex/skills/backend-base-ts-template/SKILL.md
2. .codex/skills/backend-base-ts-orchestrator/SKILL.md

## Then apply specialized skills based on task type

- Architecture and boundaries:
  .codex/skills/backend-base-ts-architecture/SKILL.md
- Feature and module implementation:
  .codex/skills/backend-base-ts-module-development/SKILL.md
- Data and repository changes:
  .codex/skills/backend-base-ts-data-access/SKILL.md
- API contracts and DTO changes:
  .codex/skills/backend-base-ts-api-contracts/SKILL.md
- Auth and security-sensitive flows:
  .codex/skills/backend-base-ts-auth-security/SKILL.md
- Logs, monitoring, and diagnostics:
  .codex/skills/backend-base-ts-observability/SKILL.md
- Performance and scalability work:
  .codex/skills/backend-base-ts-performance/SKILL.md
- Testing and quality gate:
  .codex/skills/backend-base-ts-testing-quality/SKILL.md
- Documentation and change records:
  .codex/skills/backend-base-ts-docs-maintenance/SKILL.md

## Doc-based skill library (mandatory when task matches doc topic)

- .codex/skills/backend-base-ts-doc-architecture/SKILL.md
- .codex/skills/backend-base-ts-doc-auth-routes-guide/SKILL.md
- .codex/skills/backend-base-ts-doc-changelog-improvements/SKILL.md
- .codex/skills/backend-base-ts-doc-como-trocar-repository-tsyringe/SKILL.md
- .codex/skills/backend-base-ts-doc-development-guide/SKILL.md
- .codex/skills/backend-base-ts-doc-implementation-summary/SKILL.md
- .codex/skills/backend-base-ts-doc-log-enums-guide/SKILL.md
- .codex/skills/backend-base-ts-doc-notification-cache-examples/SKILL.md
- .codex/skills/backend-base-ts-doc-readme/SKILL.md
- .codex/skills/backend-base-ts-doc-redis-cache-guide/SKILL.md
- .codex/skills/backend-base-ts-doc-role-unique-session-changes/SKILL.md
- .codex/skills/backend-base-ts-doc-scalability-and-template-improvements/SKILL.md
- .codex/skills/backend-base-ts-doc-session-mongodb-migration/SKILL.md
- .codex/skills/backend-base-ts-doc-template-presets/SKILL.md

## Context boundaries (mandatory)

Modules in `src/modules` belong to bounded contexts declared in
`boundaries.config.json`. Between modules, only `dto/` and the repository ports
in `repositories/I*Repository` may be imported. Never import another module's
Mongoose model, concrete repository, or controller. New modules must be added to
a context. See `docs/BOUNDARIES.md`.

Every module declares itself in `src/modules/<name>/module.ts` (`defineModule`),
including its `context` and `dependsOn`. Never wire a module by editing
`src/shared/container/index.ts` or `src/shared/infra/https/routes/index.ts` —
they no longer list modules. See `docs/MODULES.md`.

## Completion gate

Before finalizing any code change, run:

- npm run lint
- npm run build
- npm run check:boundaries
- npm run test

If tests cannot run, the agent must clearly state the blocker and risk impact.
