---
name: backend-base-ts-doc-readme
description: |
  Use this skill when you need guidance from docs/README.md in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-doc-readme
  - doc-readme
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - readme
---

# Backend Base TS - Doc Readme

Use this skill when you need guidance from docs/README.md in backend-base-ts.

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

# 📚 Documentação do Projeto

## Objective
Apply the canonical guidance from docs/README.md without diverging from repository standards.

## When to use

- When implementing or refactoring behavior covered by this document.
- When reviewing changes that touch the same concerns.
- When validating architecture, contracts, or operational rules described here.

## Source document

- docs/README.md

## Canonical guidance

# 📚 Documentação do Projeto

Esta pasta contém toda a documentação técnica do backend base TypeScript.

## 📖 Guias Disponíveis

### 1. [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)
**Guia completo de desenvolvimento** - Leia este primeiro!

Contém:
- Visão geral da arquitetura Clean Architecture/DDD
- Estrutura detalhada de módulos
- Utilities compartilhadas organizadas
- Como usar snippets VS Code
- Como usar o CLI Generator
- Padrões de código e boas práticas

**Público-alvo**: Desenvolvedores que vão trabalhar no projeto

---

### 2. [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
**Resumo executivo das melhorias implementadas**

Contém:
- Resumo do que foi implementado (Fases 1-3)
- Como usar as novas ferramentas
- Guia de início rápido
- Próximos passos recomendados
- Comparativo antes/depois

**Público-alvo**: Gerentes de projeto, líderes técnicos, novos desenvolvedores

---

### 3. [CHANGELOG_IMPROVEMENTS.md](CHANGELOG_IMPROVEMENTS.md)
**Registro detalhado de mudanças técnicas**

Contém:
- Lista completa de arquivos modificados/criados
- Detalhes técnicos de cada mudança
- Benefícios de cada melhoria
- Impacto na produtividade

**Público-alvo**: Revisores de código, auditores, desenvolvedores curiosos

---

## 🚀 Quick Start

### Para começar a desenvolver:
1. Leia o [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)
2. Crie seu primeiro módulo: `npm run generate:module products`
3. Consulte os snippets em [.vscode/SNIPPETS_GUIDE.md](../.vscode/SNIPPETS_GUIDE.md)

### Para entender as melhorias:
1. Leia o [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
2. Veja os detalhes em [CHANGELOG_IMPROVEMENTS.md](CHANGELOG_IMPROVEMENTS.md)

---

## 📂 Estrutura

```
docs/
├── README.md                      # Este arquivo (índice da documentação)
├── DEVELOPMENT_GUIDE.md           # Guia completo de desenvolvimento
├── IMPLEMENTATION_SUMMARY.md      # Resumo executivo das melhorias
└── CHANGELOG_IMPROVEMENTS.md      # Changelog detalhado técnico
```

---

**Última atualização**: 10 de abril de 2026

