---
name: backend-base-ts-doc-como-trocar-repository-tsyringe
description: |
  Use this skill when you need guidance from docs/Como_trocar_repository_tsyringe.md in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-doc-como-trocar-repository-tsyringe
  - doc-como-trocar-repository-tsyringe
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - como
  - trocar
  - repository
  - tsyringe
---

# Backend Base TS - Doc Como Trocar Repository Tsyringe

Use this skill when you need guidance from docs/Como_trocar_repository_tsyringe.md in backend-base-ts.

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

# Como Trocar a Implementação de um Repository com tsyringe

## Objective
Apply the canonical guidance from docs/Como_trocar_repository_tsyringe.md without diverging from repository standards.

## When to use

- When implementing or refactoring behavior covered by this document.
- When reviewing changes that touch the same concerns.
- When validating architecture, contracts, or operational rules described here.

## Source document

- docs/Como_trocar_repository_tsyringe.md

## Canonical guidance

# Como Trocar a Implementação de um Repository com tsyringe

## Objetivo
Explicar como alternar facilmente entre diferentes implementações de repository usando o padrão de injeção de dependências com tsyringe.

---

## 1. Defina a Interface do Repository
```typescript
export default interface IUsersRepository {
  findById(id: string): Promise<IUserDTO | null>;
  // ...outros métodos...
}
```

---

## 2. Implemente diferentes versões do Repository

### Exemplo: MongoDB
```typescript
import { injectable } from 'tsyringe';
import IUsersRepository from '@modules/users/repositories/IUsersRepository';

@injectable()
export default class UsersRepository implements IUsersRepository {
  // ...implementação real...
}
```

### Exemplo: Memória (para testes)
```typescript
import { injectable } from 'tsyringe';
import IUsersRepository from '@modules/users/repositories/IUsersRepository';

@injectable()
export default class UsersMemoryRepository implements IUsersRepository {
  // ...implementação em memória...
}
```

---

## 3. Registre a Implementação no Container

No arquivo de container (ex: src/modules/users/container/index.ts):

### Para produção (MongoDB):
```typescript
import { container } from 'tsyringe';
import IUsersRepository from '@modules/users/repositories/IUsersRepository';
import UsersRepository from '@modules/users/infra/mongo/repositories/UsersRepository';

container.registerSingleton<IUsersRepository>(
  'UsersRepository',
  UsersRepository,
);
```

### Para testes (Memória):
```typescript
import { container } from 'tsyringe';
import IUsersRepository from '@modules/users/repositories/IUsersRepository';
import UsersMemoryRepository from '@modules/users/infra/memory/repositories/UsersMemoryRepository';

container.registerSingleton<IUsersRepository>(
  'UsersRepository',
  UsersMemoryRepository,
);
```

---

## 4. Injeção no Service
```typescript
import { injectable, inject } from 'tsyringe';
import IUsersRepository from '@modules/users/repositories/IUsersRepository';

@injectable()
export class UserService {
  constructor(
    @inject('UsersRepository')
    private usersRepository: IUsersRepository,
  ) {}
  // ...
}
```

---

## 5. Como trocar a implementação
Basta alterar o registro no container para a implementação desejada. Nenhum outro arquivo do sistema precisa ser modificado.

---

## Vantagens
- Código desacoplado e fácil de manter.
- Facilidade para testes (mock ou memória).
- Troca de tecnologia sem impacto no restante do sistema.

---

Dúvidas ou sugestões? Fique à vontade para perguntar!

