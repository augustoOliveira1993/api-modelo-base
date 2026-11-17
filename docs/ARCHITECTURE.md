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
├── permissions/
│   └── ACL.ts                       ← Catálogo local de permissões
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
│   │   └── routes/
│   │       └── {resource}Router.ts      ← Definição de rotas Express
│   └── mongo/
│       ├── models/
│       │   └── {Resource}.ts            ← Schema Mongoose
│       └── repositories/
│           └── {Resource}Repository.ts  ← Implementação do repositório
│
├── services/
    └── {resource}/
        ├── CreateService.ts        ← Criação
        ├── UpdateService.ts        ← Atualização
        ├── DeleteService.ts        ← Deleção
        ├── FindAllService.ts       ← Listagem com paginação/busca
        └── FindByIdService.ts      ← Busca por ID
└── module.ts                       ← Contexto, dependências e routers instalados
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

Define os endpoints com `defineRoutes`. Todo campo de middleware é um array;
middlewares de rota executam depois da autenticação e autorização:

```typescript
import UsersController from '@modules/users/infra/https/controllers/UsersController';
import { defineRoutes } from '@shared/infra/https/routes/defineRoutes';
import { verifyToken } from '@shared/middlewares/authMiddleware';
import { validateRequest } from '@shared/middlewares/validateRequest';
import { createUsersSchema } from '@modules/users/infra/https/schemas/UsersSchemas';

const controller = new UsersController();

export default defineRoutes({
  authentication: [verifyToken],
  beforeMiddleware: [],
  afterMiddleware: [],
  routes: [
    { method: 'POST', path: '/', auth: false, middleware: [validateRequest(createUsersSchema)], handler: controller.create },
    { method: 'GET', path: '/', middleware: [], handler: controller.findAll },
    { method: 'GET', path: '/:id', middleware: [], handler: controller.findById },
    { method: 'PUT', path: '/:id', middleware: [], handler: controller.update },
    { method: 'DELETE', path: '/:id', middleware: [], handler: controller.delete },
  ],
});
```

**Onde fica:** `src/modules/{modulo}/infra/https/routes/`
**Convenção de nome:** `{resource}Router.ts` (camelCase)

Rotas que exigem grants usam `@RequiredPermission(ACL.recurso.acao)` no
método do controller. Todas as permissões declaradas são exigidas. O decorator
usa o middleware `authorize` existente e mantém wildcard e bypass de admin.

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
O loader de módulos importa esse arquivo antes dos routers; não registre um
módulo novo nos agregadores globais.

---

## Camada Compartilhada (shared/)

Tudo que é **reutilizado por múltiplos módulos** fica em `src/shared/`:

| Pasta                          | Propósito                     | Exemplos                                    |
| ------------------------------ | ----------------------------- | ------------------------------------------- |
| `shared/container/`            | Infraestrutura DI compartilhada | Bootstrap e portas compartilhadas        |
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

2. O `ModuleRegistry` importa containers dos módulos selecionados antes de
   carregar os routers declarados em cada `module.ts`.

3. Services usam @inject para receber dependências:
   @inject('UsersRepository') private repository: IUsersRepository

4. Controllers resolvem Services via container.resolve():
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
const router = defineRoutes({
  authentication: [verifyToken],
  beforeMiddleware: [],
  afterMiddleware: [],
  routes: [
    { method: 'GET', path: '/', middleware: [validateRequest(listSchema)], handler: controller.findAll },
    { method: 'POST', path: '/signup', auth: false, middleware: [verifySignUp.checkDuplicateEmail], handler: controller.signup },
  ],
});
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
yarn generate:module -- nome-do-modulo --context=cadastros
yarn generate:sub-module -- nome-do-modulo regra-de-preco --dry-run
```

O gerador cria DTO, repositório, model, services CRUD, controller, rotas via
`defineRoutes`, teste colocalizado e `permissions/ACL.ts`. O módulo se instala
por `module.ts`; o submódulo compartilha contexto, DI e ACL do pai e é montado
em `/api/<modulo>/<submodulo>`.

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
10. Declarar contexto e rotas em `module.ts`
11. Registrar o módulo no contexto de `boundaries.config.json`

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
| Novo módulo CRUD completo          | `yarn generate:module -- nome --context=<contexto>` |
| Novo submódulo                     | `yarn generate:sub-module -- pai nome`              |
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
- [ ] ACL local e decorators `@RequiredPermission` para rotas autorizadas
- [ ] Router usa `defineRoutes`; campos middleware são arrays e rotas públicas têm `auth: false`
- [ ] Container registra repositório como Singleton
- [ ] `module.ts` registra contexto, dependências e rotas
- [ ] Contexto declarado em `boundaries.config.json`
- [ ] Teste colocalizado `nomeDoArquivo.test.ts`
