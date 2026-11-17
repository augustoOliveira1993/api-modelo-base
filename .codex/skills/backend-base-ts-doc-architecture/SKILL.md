---
name: backend-base-ts-doc-architecture
description: |
  Use this skill when you need guidance from docs/ARCHITECTURE.md in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-doc-architecture
  - doc-architecture
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - architecture
---

# Backend Base TS - Doc Architecture

Use this skill when you need guidance from docs/ARCHITECTURE.md in backend-base-ts.

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

# Arquitetura do Projeto — Backend Base TS

## Objective
Apply the canonical guidance from docs/ARCHITECTURE.md without diverging from repository standards.

## When to use

- When implementing or refactoring behavior covered by this document.
- When reviewing changes that touch the same concerns.
- When validating architecture, contracts, or operational rules described here.

## Source document

- docs/ARCHITECTURE.md

## Canonical guidance

# Arquitetura do Projeto — Backend Base TS

## Sumário

1. [Visão Geral](#visão-geral)
2. [Estrutura de Pastas](#estrutura-de-pastas)
3. [Padrão Arquitetural](#padrão-arquitetural)
4. [Fluxo de uma Requisição](#fluxo-de-uma-requisição)
5. [Anatomia de um Módulo](#anatomia-de-um-módulo)
6. [Camada Compartilhada (shared/)](#camada-compartilhada-shared)
7. [Injeção de Dependências](#injeção-de-dependências)
8. [Middlewares — Global vs Específico](#middlewares--global-vs-específico)
9. [Padrão de Resposta da API](#padrão-de-resposta-da-api)
10. [Convenções de Nomenclatura](#convenções-de-nomenclatura)
11. [Feature Flags](#feature-flags)
12. [Criando um Novo Módulo](#criando-um-novo-módulo)
13. [Path Aliases (tsconfig)](#path-aliases-tsconfig)
14. [Referência Rápida](#referência-rápida)

---

## Visão Geral

Este projeto utiliza **Clean Architecture com estrutura modular** (inspirada em DDD — Domain-Driven Design), com:

| Tecnologia      | Uso                             |
| --------------- | ------------------------------- |
| **Express**     | Framework HTTP                  |
| **TypeScript**  | Linguagem                       |
| **MongoDB**     | Banco de dados                  |
| **Mongoose**    | ODM para MongoDB                |
| **tsyringe**    | Injeção de dependências (DI)    |
| **Winston**     | Logging com rotação de arquivos |
| **prom-client** | Métricas Prometheus             |
| **ioredis**     | Cache Redis                     |

---

## Estrutura de Pastas

```
src/
├── config/                          # ⚙️ Configurações globais
│   ├── features.config.ts           #    Feature flags (liga/desliga funcionalidades)
│   ├── redis.config.ts              #    Configuração do Redis
│   ├── auth/
│   │   ├── activeDirectory.ts       #    Configuração do Active Directory
│   │   └── jwt.config.ts            #    Configuração do JWT (secret, expiração)
│   ├── database/
│   │   ├── mongodb.config.ts        #    Conexão MongoDB (principal)
│   │   ├── sequelize.config.ts      #    Configuração Sequelize (opcional)
│   │   └── sequelize.connection.ts  #    Conexão Sequelize (opcional)
│   └── storage/
│       └── upload.config.ts         #    Configuração de uploads (multer)
│
├── modules/                         # 📦 Módulos de domínio (cada módulo é independente)
│   ├── log/                         #    Módulo de Logs
│   ├── notification/                #    Módulo de Notificações
│   └── users/                       #    Módulo de Usuários (auth, roles, permissões)
│
├── shared/                          # 🌐 Código compartilhado entre todos os módulos
│   ├── container/
│   │   └── index.ts                 #    Container DI principal (registra todos os módulos)
│   ├── errors/
│   │   ├── AppError.ts              #    Classe base de erros da aplicação
│   │   └── MongoErrors.ts           #    Mapper de erros do MongoDB
│   ├── infra/
│   │   ├── circuitBreaker/
│   │   │   └── CircuitBreaker.ts    #    Proteção para chamadas externas
│   │   ├── database/
│   │   │   └── mongo/
│   │   │       ├── BaseMongoRepository.ts       # 🔑 Classe base de repositório (CRUD genérico)
│   │   │       ├── IBaseMongoRepository.ts       #    Interface do BaseMongoRepository
│   │   │       ├── IBaseRepository.ts            #    Interface genérica de repositório
│   │   │       ├── IBaseSoftDeleteRepository.ts  #    Interface para soft delete
│   │   │       └── SoftDeleteMongoRepository.ts  #    Implementação de soft delete
│   │   ├── https/
│   │   │   ├── app.ts               #    Configuração do Express (middlewares, rotas, errors)
│   │   │   ├── server.ts            #    Inicialização do servidor HTTP/HTTPS
│   │   │   ├── health/
│   │   │   │   └── HealthService.ts  #   Endpoint /health (MongoDB, Redis, Memory, CPU)
│   │   │   └── routes/
│   │   │       └── index.ts          #   Agregador de rotas de todos os módulos
│   │   └── monitoring/
│   │       └── MetricsService.ts     #   Métricas Prometheus (/metrics)
│   ├── middlewares/
│   │   ├── rateLimiter.ts           #    Rate limiting global + auth-specific
│   │   └── cacheMiddleware.ts       #    Middlewares de cache Redis
│   ├── plugins/
│   │   └── autoIncrementCodigo.ts   #    Plugin Mongoose de auto-incremento
│   ├── services/
│   │   └── email/                   #    Serviço de envio de emails
│   ├── socket/
│   │   ├── ExternalSocketClient.ts  #    Cliente Socket.IO para serviços externos
│   │   └── SocketManager.ts        #    Gerenciador de conexões WebSocket
│   ├── types/
│   │   └── global.d.ts             #    Tipos globais (IModelPopulated, IPaginatedResult, etc.)
│   └── utils/
│       ├── helpers.ts               #    Funções utilitárias gerais
│       ├── index.ts                 #    Export barrel
│       ├── logger.ts               #    Winston logger com rotação diária
│       ├── comparison/             #    Utilitários de comparação/diff
│       ├── excel/                  #    Geração de Excel
│       ├── formatters/             #    Formatação (datas, tempo)
│       ├── pagination/             #    Helpers de paginação
│       ├── search/                 #    Helpers de busca textual
│       ├── transactions/           #    Gerenciador de transações MongoDB
│       └── validation/             #    Validação de dados
│
└── tmp/                            #    Arquivos temporários (uploads)
```

---

## Padrão Arquitetural

O projeto segue o princípio de **separação por camadas**, onde cada camada tem uma responsabilidade clara:

```
┌─────────────────────────────────────────────────────────┐
│                    INFRA / HTTP                          │
│  Routes → Controllers                                    │
│  (Express Router)  (Resolve Services, trata req/res)     │
├─────────────────────────────────────────────────────────┤
│                    APPLICATION                           │
│  Services                                                │
│  (Lógica de negócio - 1 service = 1 ação)               │
├─────────────────────────────────────────────────────────┤
│                    DOMAIN                                 │
│  DTOs (Contratos de dados)                               │
│  Repository Interfaces (Contratos de persistência)       │
├─────────────────────────────────────────────────────────┤
│                    INFRA / DATABASE                       │
│  Repository Implementations (MongoDB/Mongoose)           │
│  Models (Mongoose Schemas)                               │
└─────────────────────────────────────────────────────────┘
```

**Regras fundamentais:**

1. **Camadas superiores NÃO conhecem as inferiores diretamente** — usam interfaces
2. **Services recebem repositórios via injeção de dependência** — nunca instanciam diretamente
3. **Um Service = Uma Ação** (Single Responsibility Principle)
4. **Controllers apenas delegam** — não contêm lógica de negócio
5. **Repositórios são abstraídos por interfaces** — permite trocar banco sem afetar lógica

---

## Fluxo de uma Requisição

```
1. Cliente faz GET /api/users

2. Express Router (src/shared/infra/https/routes/index.ts)
   └── Direciona para: /users → usersRouter

3. Module Router (src/modules/users/infra/https/routes/usersRouter.ts)
   └── Aplica middlewares: [verifyToken]
   └── Direciona para: controller.findAll

4. Controller (src/modules/users/infra/https/controllers/UsersController.ts)
   └── const service = container.resolve(FindAllService)
   └── const result = await service.execute(req.query)
   └── return res.json(result)

5. Service (src/modules/users/services/user/FindAllService.ts)
   └── @inject('UsersRepository') — recebe repositório via DI
   └── Aplica filtros, paginação
   └── Chama this.repository.findAll(queryParams)

6. Repository (src/modules/users/infra/mongo/repositories/UsersRepository.ts)
   └── Extends BaseMongoRepository — herda CRUD genérico
   └── Executa query no Mongoose Model

7. Model (src/modules/users/infra/mongo/models/User.ts)
   └── Schema Mongoose define campos, validações, timestamps
   └── Retorna dados do MongoDB

8. Resposta percorre o caminho inverso até o cliente
```

---

## Anatomia de um Módulo

Cada módulo segue **exatamente** esta estrutura:

```
modules/{nome-modulo}/
├── container/
│   └── index.ts                    ← Registro de repositórios no DI container
│
├── dto/
│   └── I{Resource}DTO.ts          ← Interfaces TypeScript (DTO + Document)
│
├── repositories/
│   └── I{Resource}Repository.ts   ← Interface do repositório (contrato)
│
├── infra/
│   ├── https/
│   │   ├── controllers/
│   │   │   └── {Resource}Controller.ts  ← Resolve services, trata HTTP
│   │   ├── middleware/                   ← (Opcional) Middlewares específicos do módulo
│   │   │   └── *.ts
│   │   └── routes/
│   │       └── {resource}Router.ts      ← Definição de rotas Express
│   └── mongo/
│       ├── models/
│       │   └── {Resource}.ts            ← Schema Mongoose
│       └── repositories/
│           └── {Resource}Repository.ts  ← Implementação do repositório
│
└── services/
    └── {resource}/
        ├── CreateService.ts        ← Criação
        ├── UpdateService.ts        ← Atualização
        ├── DeleteService.ts        ← Deleção
        ├── FindAllService.ts       ← Listagem com paginação/busca
        └── FindByIdService.ts      ← Busca por ID
```

### Detalhamento de cada arquivo:

### 1. `dto/I{Resource}DTO.ts` — Contratos de dados

Define **o que** o dado representa. Duas interfaces obrigatórias:

```typescript
import { Document } from 'mongoose';

// Interface pura dos campos (sem dependência do banco)
export interface IUserDTO {
  username: string;
  email: string;
  password: string;
  roles?: string[];
  created_by?: string | null;
  updated_by?: string | null;
}

// Interface Document (usado pelo Mongoose)
export interface IUserDocument extends IUserDTO, Document {}
```

**Onde fica:** `src/modules/{modulo}/dto/`
**Convenção de nome:** `I{Resource}DTO.ts` (sempre com prefixo `I`)

---

### 2. `repositories/I{Resource}Repository.ts` — Interface do Repositório

Define **quais operações** o repositório oferece. Estende `IBaseRepository` para herdar CRUD genérico:

```typescript
import { IUserDTO, IUserDocument } from '@modules/users/dto/IUserDTO';
import IBaseRepository from '@shared/infra/database/mongo/IBaseRepository';

export default interface IUsersRepository
  extends IBaseRepository<IUserDTO, IUserDocument> {
  // Métodos customizados (além do CRUD padrão):
  findByEmail(email: string): Promise<IUserDocument | null>;
}
```

**Onde fica:** `src/modules/{modulo}/repositories/`
**Convenção de nome:** `I{Resource}Repository.ts`

**Métodos herdados de `IBaseRepository`:**

| Método                    | Descrição                    |
| ------------------------- | ---------------------------- |
| `create(data)`            | Criar documento              |
| `findAll(query?)`         | Listar com filtros/paginação |
| `findOne(query?)`         | Buscar um documento          |
| `findById(id)`            | Buscar por ID                |
| `update(id, data)`        | Atualizar documento          |
| `delete(id)`              | Deletar documento            |
| `count(query?)`           | Contar documentos            |
| `total(query?)`           | Total sem paginação          |
| `updateMany(query, data)` | Atualizar vários             |
| `insertMany(data)`        | Inserir vários               |
| `deleteMany(query)`       | Deletar vários               |

---

### 3. `infra/mongo/models/{Resource}.ts` — Schema Mongoose

Define a **estrutura no banco de dados**:

```typescript
import { IUserDocument } from '@modules/users/dto/IUserDTO';
import mongoose, { Schema } from 'mongoose';

const schema: Schema = new Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
    created_by: { type: String },
    updated_by: { type: String },
  },
  { timestamps: true },   // Adiciona createdAt e updatedAt automaticamente
);

export const User = mongoose.model<IUserDocument>('User', schema);
```

**Onde fica:** `src/modules/{modulo}/infra/mongo/models/`
**Convenção de nome:** `{Resource}.ts` (PascalCase, sem prefixo)

---

### 4. `infra/mongo/repositories/{Resource}Repository.ts` — Implementação

Implementa a **interface do repositório** usando MongoDB/Mongoose. Estende `BaseMongoRepository` para herdar todo o CRUD:

```typescript
import { Model } from 'mongoose';
import { User } from '@modules/users/infra/mongo/models/User';
import { IUserDTO, IUserDocument } from '@modules/users/dto/IUserDTO';
import IUsersRepository from '@modules/users/repositories/IUsersRepository';
import { BaseMongoRepository } from '@shared/infra/database/mongo/BaseMongoRepository';

export default class UsersRepository
  extends BaseMongoRepository<IUserDTO, IUserDocument>
  implements IUsersRepository
{
  protected readonly model: Model<IUserDocument> = User;
  protected readonly modelPopulated = [
    { path: 'roles', select: 'name description' },
  ];

  // Métodos customizados:
  async findByEmail(email: string): Promise<IUserDocument | null> {
    return this.model.findOne({ email }).populate(this.modelPopulated);
  }
}
```

**Onde fica:** `src/modules/{modulo}/infra/mongo/repositories/`
**Convenção de nome:** `{Resource}Repository.ts`

**Propriedades obrigatórias:**

| Propriedade      | Tipo                | Descrição                                 |
| ---------------- | ------------------- | ----------------------------------------- |
| `model`          | `Model<TDocument>`  | Modelo Mongoose usado                     |
| `modelPopulated` | `IModelPopulated[]` | Array de populates automáticos (relações) |

---

### 5. `services/{resource}/` — Lógica de Negócio

Cada service é **uma classe que faz uma coisa só**. Usa injeção de dependência via decoradores:

```typescript
import { injectable, inject } from 'tsyringe';
import IUsersRepository from '@modules/users/repositories/IUsersRepository';
import { IUserDTO, IUserDocument } from '@modules/users/dto/IUserDTO';
import { IServiceResponse } from '@shared/types/global';

@injectable()
export default class CreateService {
  constructor(
    @inject('UsersRepository')
    private repository: IUsersRepository,
  ) {}

  public async execute(
    data: IUserDTO,
    userEmail: string | undefined,
  ): Promise<IServiceResponse<IUserDocument>> {
    const created = await this.repository.create({
      ...data,
      created_by: userEmail,
    });

    return {
      success: true,
      message: 'Usuário criado com sucesso!',
      data: created,
    };
  }
}
```

**Onde fica:** `src/modules/{modulo}/services/{resource}/`
**Convenção de nome:** `{Ação}Service.ts` (ex: `CreateService.ts`, `FindAllService.ts`)

**Regras:**
- Sempre decorado com `@injectable()`
- Repositórios injetados via `@inject('TokenDoContainer')`
- Método principal é `execute()`
- Retorna `IServiceResponse<T>` para operações de escrita
- Lança erros com `throw new AppError(...)` ou variantes

---

### 6. `infra/https/controllers/{Resource}Controller.ts` — Controller

**Resolve services do container** e trata request/response. Não contém lógica de negócio:

```typescript
import { Request, Response } from 'express';
import { container } from 'tsyringe';
import FindAllService from '@modules/users/services/user/FindAllService';
import CreateService from '@modules/users/services/user/CreateService';

export default class UsersController {
  public async findAll(req: Request, res: Response): Promise<Response> {
    const service = container.resolve(FindAllService);
    const result = await service.execute(req.query);
    return res.json(result);
  }

  public async create(req: Request, res: Response): Promise<Response> {
    const service = container.resolve(CreateService);
    const result = await service.execute(req.body, req.userEmail);
    return res.json(result);
  }
}
```

**Onde fica:** `src/modules/{modulo}/infra/https/controllers/`
**Convenção de nome:** `{Resource}Controller.ts` (PascalCase)

---

### 7. `infra/https/routes/{resource}Router.ts` — Rotas

Define os endpoints HTTP com seus middlewares:

```typescript
import { Router } from 'express';
import UsersController from '@modules/users/infra/https/controllers/UsersController';
import middleware from '@modules/users/infra/https/middleware';

const router = Router();
const controller = new UsersController();

router.use((req, res, next) => {
  res.header('Access-Control-Allow-Headers', 'x-access-token, Origin, Content-Type, Accept');
  next();
});

router.post('/', [middleware.authJwt.verifyToken], controller.create);
router.get('/', [middleware.authJwt.verifyToken], controller.findAll);
router.get('/:id', [middleware.authJwt.verifyToken], controller.findById);
router.put('/:id', [middleware.authJwt.verifyToken], controller.update);
router.delete('/:id', [middleware.authJwt.verifyToken], controller.delete);

export default router;
```

**Onde fica:** `src/modules/{modulo}/infra/https/routes/`
**Convenção de nome:** `{resource}Router.ts` (camelCase)

---

### 8. `container/index.ts` — Registro no DI

Registra os repositórios do módulo como Singletons no container `tsyringe`:

```typescript
import { container } from 'tsyringe';
import IUsersRepository from '@modules/users/repositories/IUsersRepository';
import UsersRepository from '@modules/users/infra/mongo/repositories/UsersRepository';

container.registerSingleton<IUsersRepository>(
  'UsersRepository',       // Token (usado no @inject dos services)
  UsersRepository,          // Implementação concreta
);
```

**Onde fica:** `src/modules/{modulo}/container/`
**Este arquivo é importado pelo container global:** `src/shared/container/index.ts`

---

## Camada Compartilhada (shared/)

Tudo que é **reutilizado por múltiplos módulos** fica em `src/shared/`:

| Pasta                          | Propósito                     | Exemplos                                    |
| ------------------------------ | ----------------------------- | ------------------------------------------- |
| `shared/container/`            | Container DI principal        | Importa containers de todos os módulos      |
| `shared/errors/`               | Classes de erro padronizadas  | `AppError`, `NotFoundError`, `MongoErrors`  |
| `shared/infra/database/mongo/` | Base repositories genéricos   | `BaseMongoRepository`, `IBaseRepository`    |
| `shared/infra/https/`          | Configuração HTTP             | `app.ts`, `server.ts`, `routes/`, `health/` |
| `shared/infra/monitoring/`     | Métricas                      | `MetricsService` (Prometheus)               |
| `shared/infra/circuitBreaker/` | Proteção de chamadas externas | Circuit Breaker (opossum)                   |
| `shared/middlewares/`          | Middlewares globais           | Rate limiter, Cache                         |
| `shared/services/`             | Serviços de infraestrutura    | Email Service                               |
| `shared/socket/`               | Gerenciamento WebSocket       | Socket Manager, External Client             |
| `shared/types/`                | Tipos globais TypeScript      | `IModelPopulated`, `IPaginatedResult`       |
| `shared/utils/`                | Funções utilitárias           | Logger, Pagination, Search, Formatters      |

---

## Injeção de Dependências

O projeto usa **tsyringe** com padrão de registro em Singleton.

### Como funciona:

```
1. Cada módulo registra seus repositórios no container local:
   src/modules/users/container/index.ts
   → container.registerSingleton<IUsersRepository>('UsersRepository', UsersRepository)

2. O container global importa todos os módulos:
   src/shared/container/index.ts
   → import '@modules/users/container'
   → import '@modules/log/container'
   → import '@modules/notification/container'

3. O app.ts importa o container global no boot:
   import '@shared/container'

4. Services usam @inject para receber dependências:
   @inject('UsersRepository') private repository: IUsersRepository

5. Controllers resolvem Services via container.resolve():
   const service = container.resolve(CreateService)
```

### Tokens registrados:

| Token                        | Interface                   | Implementação              |
| ---------------------------- | --------------------------- | -------------------------- |
| `'UsersRepository'`          | `IUsersRepository`          | `UsersRepository`          |
| `'BlocksRepository'`         | `IBlockRepository`          | `BlocksRepository`         |
| `'RoleRepository'`           | `IRoleRepository`           | `RoleRepository`           |
| `'PermissaoRepository'`      | `IPermissaoRepository`      | `PermissaoRepository`      |
| `'PermissaoGrupoRepository'` | `IPermissaoGrupoRepository` | `PermissaoGrupoRepository` |
| `'LogRepository'`            | `ILogRepository`            | `LogRepository`            |
| `'NotificationRepository'`   | `INotificationRepository`   | `NotificationRepository`   |
| `'ExternalSocketManager'`    | `ExternalSocketManager`     | `ExternalSocketManager`    |

---

## Middlewares — Global vs Específico

### Middlewares Globais

Aplicados **automaticamente em todas as requisições** no `app.ts`:

| Middleware              | Feature Flag     | Descrição                                |
| ----------------------- | ---------------- | ---------------------------------------- |
| **Helmet**              | `HELMET`         | Security headers (XSS, HSTS, etc.)       |
| **express.json()**      | — (sempre ativo) | Parse de body JSON                       |
| **Mongo Sanitize**      | `MONGO_SANITIZE` | Previne NoSQL injection                  |
| **Rate Limiter Global** | `RATE_LIMIT`     | 200 req/min (prod) ou 1000/min (dev)     |
| **Metrics Middleware**  | `METRICS`        | Coleta tempo de resposta para Prometheus |
| **CORS**                | — (sempre ativo) | Configurável via env `CORS`              |
| **Static Files**        | — (sempre ativo) | Serve uploads em `/files`                |

**Onde configurar:** `src/shared/infra/https/app.ts` → método `middlewares()`

### Middlewares de Rota (Específicos)

Aplicados **apenas em rotas específicas** diretamente no router:

| Middleware        | Módulo | Uso                                                       |
| ----------------- | ------ | --------------------------------------------------------- |
| `verifyToken`     | users  | Verifica JWT — usado em **todas as rotas protegidas**     |
| `verifySignup`    | users  | Valida dados de cadastro — usado apenas em `/auth/signup` |
| `authRateLimiter` | shared | 10 req/min — usado apenas em rotas `/auth/*`              |

**Exemplo de uso em rota:**
```typescript
// Middleware de autenticação aplicado por rota:
router.get('/', [middleware.authJwt.verifyToken], controller.findAll);

// Múltiplos middlewares podem ser encadeados:
router.post('/signup', [middleware.verifySignUp.checkDuplicateEmail], controller.signup);
```

### Middlewares de Cache (Disponíveis mas opcionais)

| Middleware                         | Descrição                                       |
| ---------------------------------- | ----------------------------------------------- |
| `cacheMiddleware`                  | Verifica cache Redis antes de processar request |
| `updateCacheMiddleware`            | Atualiza cache Redis após response              |
| `invalidateCacheMiddleware`        | Invalida cache ao alterar dados                 |
| `invalidateCacheDynamicMiddleware` | Invalida cache automaticamente para non-GET     |

**Onde ficam:** `src/shared/middlewares/cacheMiddleware.ts`
**Quando usar:** Habilite via feature flag `REDIS_CACHE` se Redis estiver configurado.

---

## Padrão de Resposta da API

### Sucesso — Operação de escrita (create, update, delete)

```json
{
  "success": true,
  "message": "Recurso criado com sucesso!",
  "data": { /* documento criado/atualizado */ }
}
```

### Sucesso — Listagem com paginação

```json
{
  "data": [ /* array de documentos */ ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Erro — AppError

```json
{
  "success": false,
  "status_code": 400,
  "title": "BadRequest",
  "message": "Descrição do erro"
}
```

### Erro — Interno (500)

```json
{
  "success": false,
  "title": "Ocorreu um erro interno!",
  "message": "Erro interno no servidor.",
  "error": "mensagem original",
  "type_error": "TypeError"
}
```

---

## Convenções de Nomenclatura

### Arquivos

| Tipo                   | Padrão                     | Exemplo                                 |
| ---------------------- | -------------------------- | --------------------------------------- |
| DTOs                   | `I{Resource}DTO.ts`        | `IUserDTO.ts`                           |
| Interfaces de Repo     | `I{Resource}Repository.ts` | `IUsersRepository.ts`                   |
| Implementações de Repo | `{Resource}Repository.ts`  | `UsersRepository.ts`                    |
| Models Mongoose        | `{Resource}.ts`            | `User.ts`                               |
| Services               | `{Ação}Service.ts`         | `CreateService.ts`, `FindAllService.ts` |
| Controllers            | `{Resource}Controller.ts`  | `UsersController.ts`                    |
| Rotas                  | `{resource}Router.ts`      | `usersRouter.ts`                        |

### Código

| Tipo       | Padrão               | Exemplo                                |
| ---------- | -------------------- | -------------------------------------- |
| Classes    | PascalCase           | `UsersRepository`, `CreateService`     |
| Interfaces | `I` + PascalCase     | `IUserDTO`, `ILogRepository`           |
| Enums      | `E` + PascalCase     | `ENameRoleDefault`, `EActionType`      |
| Métodos    | camelCase            | `findByEmail()`, `execute()`           |
| Variáveis  | camelCase            | `userEmail`, `queryParams`             |
| Tokens DI  | PascalCase em string | `'UsersRepository'`, `'LogRepository'` |

---

## Feature Flags

Controlam quais funcionalidades estão ativas. Configuradas em `src/config/features.config.ts`.

Uso no código:
```typescript
import { isEnabled } from '@config/features.config';

if (isEnabled('REDIS_CACHE')) {
  // código que depende do Redis
}
```

| Flag                  | Descrição                        | Default |
| --------------------- | -------------------------------- | ------- |
| `METRICS`             | Endpoint `/metrics` (Prometheus) | `.env`  |
| `HEALTH_CHECK`        | Endpoint `/health`               | `.env`  |
| `RATE_LIMIT`          | Rate limiting global             | `.env`  |
| `HELMET`              | Security headers                 | `.env`  |
| `MONGO_SANITIZE`      | Previne NoSQL injection          | `.env`  |
| `CIRCUIT_BREAKER`     | Proteção de serviços externos    | `.env`  |
| `REDIS_CACHE`         | Cache Redis                      | `.env`  |
| `EMAIL_NOTIFICATIONS` | Envio de emails                  | `.env`  |

---

## Criando um Novo Módulo

### Opção 1: Gerador automático (recomendado)

```bash
yarn generate:module nome-do-modulo
```

Isso cria automaticamente **toda a estrutura** (DTO, Repository, Model, Services CRUD, Controller, Routes, Container) e registra nas rotas e no container global.

### Opção 2: Manual

1. Criar a estrutura de pastas conforme a [Anatomia de um Módulo](#anatomia-de-um-módulo)
2. Criar DTO em `dto/I{Resource}DTO.ts`
3. Criar interface em `repositories/I{Resource}Repository.ts`
4. Criar model em `infra/mongo/models/{Resource}.ts`
5. Criar implementação em `infra/mongo/repositories/{Resource}Repository.ts`
6. Criar services em `services/{resource}/`
7. Criar controller em `infra/https/controllers/{Resource}Controller.ts`
8. Criar routes em `infra/https/routes/{resource}Router.ts`
9. Criar container em `container/index.ts`
10. Registrar no container global: `src/shared/container/index.ts`
11. Registrar nas rotas: `src/shared/infra/https/routes/index.ts`

---

## Path Aliases (tsconfig)

Aliases definidos para evitar imports relativos longos:

| Alias            | Resolve para         | Exemplo de uso                                    |
| ---------------- | -------------------- | ------------------------------------------------- |
| `@modules/*`     | `src/modules/*`      | `import X from '@modules/users/dto/IUserDTO'`     |
| `@config/*`      | `src/config/*`       | `import X from '@config/database/mongodb.config'` |
| `@shared/*`      | `src/shared/*`       | `import X from '@shared/errors/AppError'`         |
| `@utils/*`       | `src/shared/utils/*` | `import X from '@utils/logger'`                   |
| `@globalTypes/*` | `src/shared/types/*` | `import X from '@globalTypes/global'`             |

**Sempre use aliases** em vez de caminhos relativos (`../../shared/...`).

---

## Referência Rápida

### Onde fica cada coisa?

| "Preciso de..."                    | Onde criar/editar                                   |
| ---------------------------------- | --------------------------------------------------- |
| Novo módulo CRUD completo          | `yarn generate:module nome`                         |
| Nova rota                          | `src/modules/{modulo}/infra/https/routes/`          |
| Nova lógica de negócio             | `src/modules/{modulo}/services/{resource}/`         |
| Novo campo no banco                | `src/modules/{modulo}/infra/mongo/models/` + `dto/` |
| Middleware global                  | `src/shared/middlewares/` + registrar em `app.ts`   |
| Middleware de rota                 | `src/modules/{modulo}/infra/https/middleware/`      |
| Novo tipo global                   | `src/shared/types/global.d.ts`                      |
| Nova feature flag                  | `src/config/features.config.ts`                     |
| Nova configuração (DB, Auth, etc.) | `src/config/{categoria}/`                           |
| Utilitário compartilhado           | `src/shared/utils/`                                 |
| Serviço de infraestrutura          | `src/shared/services/`                              |
| Erro customizado                   | `src/shared/errors/`                                |
| Snippets VSCode                    | `.vscode/snippets.code-snippets`                    |

### Checklist de novo módulo

- [ ] DTO criado com interface + Document
- [ ] Interface de repositório estende `IBaseRepository`
- [ ] Model Mongoose com `timestamps: true`
- [ ] Repositório estende `BaseMongoRepository`
- [ ] Services com `@injectable()` e `@inject()`
- [ ] Controller resolve services via `container.resolve()`
- [ ] Router com `middleware.authJwt.verifyToken` nas rotas protegidas
- [ ] Container registra repositório como Singleton
- [ ] Container importado em `src/shared/container/index.ts`
- [ ] Router importado em `src/shared/infra/https/routes/index.ts`

