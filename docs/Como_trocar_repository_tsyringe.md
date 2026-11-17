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
