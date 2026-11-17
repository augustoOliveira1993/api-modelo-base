---
name: backend-base-ts-doc-development-guide
description: |
  Use this skill when you need guidance from docs/DEVELOPMENT_GUIDE.md in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-doc-development-guide
  - doc-development-guide
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - development
  - guide
---

# Backend Base TS - Doc Development Guide

Use this skill when you need guidance from docs/DEVELOPMENT_GUIDE.md in backend-base-ts.

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

# 🚀 Backend Base TypeScript - Guia Completo de Desenvolvimento

## Objective
Apply the canonical guidance from docs/DEVELOPMENT_GUIDE.md without diverging from repository standards.

## When to use

- When implementing or refactoring behavior covered by this document.
- When reviewing changes that touch the same concerns.
- When validating architecture, contracts, or operational rules described here.

## Source document

- docs/DEVELOPMENT_GUIDE.md

## Canonical guidance

# 🚀 Backend Base TypeScript - Guia Completo de Desenvolvimento

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Estrutura de Módulos](#estrutura-de-módulos)
- [Utilities Compartilhadas](#utilities-compartilhadas)
- [Desenvolvimento Rápido](#desenvolvimento-rápido)
- [Snippets VS Code](#snippets-vs-code)
- [CLI Generator](#cli-generator)
- [Padrões de Código](#padrões-de-código)
- [Testing](#testing)

---

## 🎯 Visão Geral

Este backend segue **Clean Architecture** com elementos de **Domain-Driven Design (DDD)**, utilizando TypeScript, Express e MongoDB para criar uma aplicação altamente escalável e de fácil manutenção.

### Tecnologias Principais

- **Node.js** + **TypeScript**
- **Express.js** (API REST)
- **MongoDB** + **Mongoose** (Database)
- **Redis** (Cache)
- **Socket.IO** (Real-time)
- **TSyringe** (Dependency Injection)
- **Winston** (Logging)

---

## 🏗️ Arquitetura

### Clean Architecture com DDD

```
📦 src/
├── 📂 config/              # Configurações (DB, Auth, Redis, etc)
├── 📂 middlewares/         # Middlewares globais
├── 📂 modules/             # Módulos de negócio (DDD)
│   ├── 📂 log/
│   ├── 📂 notification/
│   └── 📂 users/
└── 📂 shared/              # Código compartilhado
    ├── 📂 container/       # DI Container
    ├── 📂 errors/          # Error handling
    ├── 📂 infra/           # Infraestrutura
    ├── 📂 services/        # Serviços compartilhados
    ├── 📂 socket/          # Socket.IO manager
    ├── 📂 types/           # TypeScript types
    └── 📂 utils/           # Utilities
```

### Camadas por Módulo

```
📂 modules/products/
├── 📂 container/           # DI registration
│   └── index.ts
├── 📂 dto/                 # Data Transfer Objects
│   └── IProductDTO.ts
├── 📂 infra/               # Infrastructure layer
│   ├── 📂 https/
│   │   ├── 📂 controllers/
│   │   └── 📂 routes/
│   └── 📂 mongo/
│       ├── 📂 models/
│       └── 📂 repositories/
├── 📂 repositories/        # Repository interfaces
│   └── IProductRepository.ts
└── 📂 services/            # Business logic (Use Cases)
    └── 📂 product/
        ├── CreateService.ts
        ├── UpdateService.ts
        ├── DeleteService.ts
        ├── FindAllService.ts
        └── FindByIdService.ts
```

---

## 📚 Utilities Compartilhadas

Utilities organizadas em módulos especializados para fácil importação:

### Estrutura

```typescript
// Importação centralizada
import {
  isValidMongoId,           // validation
  readExcelSheetToJson,     // excel
  applyPaginationParams,    // pagination
  parseExpirationTime,      // formatters
  applySearchParam,         // search
  getDiffJson               // comparison
} from '@shared/utils';

// Ou importação específica
import { applyPaginationParams } from '@shared/utils/pagination';
```

### Módulos Disponíveis

| Módulo         | Funções                                                   | Uso                       |
| -------------- | --------------------------------------------------------- | ------------------------- |
| **validation** | `isValidMongoId`                                          | Validar ObjectIds MongoDB |
| **excel**      | `readExcelSheetToJson`, `jsonToExcel`, `convertExcelDate` | Manipulação de planilhas  |
| **pagination** | `applyPaginationParams`, `buildPaginatedResult`           | Paginação padronizada     |
| **formatters** | `parseExpirationTime`, `calculatePercentage`              | Formatação de dados       |
| **search**     | `applySearchParam`                                        | Busca textual e numérica  |
| **comparison** | `getDiffJson`                                             | Comparação de objetos     |

### Exemplo de Uso: Paginação + Busca

```typescript
import { applyPaginationParams, buildPaginatedResult } from '@shared/utils/pagination';
import { applySearchParam } from '@shared/utils/search';

export default class FindAllService {
  async execute(query: Record<string, any>) {
    let queryParams: Record<string, any> = {};

    // Busca textual
    queryParams = applySearchParam(query, queryParams, {
      textFields: ['name', 'description'],
      numberFields: ['codigo'],
    });

    // Paginação
    queryParams = applyPaginationParams(query, queryParams);

    const [total, data] = await Promise.all([
      this.repository.total(queryParams),
      this.repository.findAll(queryParams),
    ]);

    return buildPaginatedResult(data, total, query);
  }
}
```

---

## ⚡ Desenvolvimento Rápido

### Opção 1: CLI Generator (Recomendado)

Gera módulo completo automaticamente:

```bash
# Criar módulo "products"
npm run generate:module products

# Criar módulo "orders"
npm run generate:module orders
```

**O que é gerado:**

- ✅ Estrutura de pastas completa
- ✅ DTO + interfaces
- ✅ Model Mongoose
- ✅ Repository (interface + implementação)
- ✅ 5 Services CRUD (Create, Update, Delete, FindAll, FindById)
- ✅ Controller completo
- ✅ Routes configuradas
- ✅ DI Container registrado
- ✅ Auto-registro em container global e routes global

### Opção 2: VS Code Snippets

Para customização manual rápida:

| Trigger            | Descrição                       |
| ------------------ | ------------------------------- |
| `dto`              | DTO interface                   |
| `repo-interface`   | Repository interface            |
| `repo-impl`        | Repository implementation       |
| `model`            | Mongoose model                  |
| `service-create`   | Create service                  |
| `service-update`   | Update service                  |
| `service-delete`   | Delete service                  |
| `service-findall`  | FindAll service (com paginação) |
| `service-findbyid` | FindById service                |
| `controller-crud`  | Controller completo             |
| `routes-crud`      | Routes completas                |
| `container-di`     | DI registration                 |

**Como usar:**

1. Crie o arquivo (ex: `CreateService.ts`)
2. Digite o snippet (ex: `service-create`)
3. Pressione `Tab`
4. Preencha os placeholders

Veja mais em [.vscode/SNIPPETS_GUIDE.md](.vscode/SNIPPETS_GUIDE.md)

---

## 📝 Padrões de Código

### Interfaces Base (global.d.ts)

```typescript
// Resposta de serviço padronizada
interface IServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Resultado paginado
interface IPaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

### Error Handling

```typescript
import { NotFoundError, BadRequestError } from '@shared/errors/AppError';

// Not Found
throw new NotFoundError({ message: 'Recurso não encontrado' });

// Bad Request
throw new BadRequestError({ message: 'Dados inválidos' });

// Unauthorized
throw new UnauthorizedError({ message: 'Não autorizado' });
```

### Dependency Injection

```typescript
// Service
@injectable()
export default class CreateService {
  constructor(
    @inject('ProductRepository')
    private repository: IProductRepository,
  ) {}
}

// Container registration
container.registerSingleton<IProductRepository>(
  'ProductRepository',
  ProductRepository,
);
```

### Repository Pattern

```typescript
// Interface
export default interface IProductRepository
  extends IBaseRepository<IProductDTO, IProductDocument> {
  findByName(name: string): Promise<IProductDocument | null>;
}

// Implementation
export default class ProductRepository
  extends BaseMongoRepository<IProductDTO, IProductDocument>
  implements IProductRepository
{
  protected readonly model: Model<IProductDocument> = Product;

  async findByName(name: string) {
    return this.model.findOne({ name });
  }
}
```

---

## 🧪 Testing

### Estrutura de Testes (Recomendado)

```
src/
├── modules/
│   └── products/
│       └── services/
│           └── product/
│               ├── CreateService.ts
│               └── __tests__/
│                   └── CreateService.spec.ts
```

### Exemplo de Teste Unitário

```typescript
import CreateService from '../CreateService';
import { IProductRepository } from '../../repositories/IProductRepository';

describe('CreateService', () => {
  let service: CreateService;
  let mockRepository: jest.Mocked<IProductRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findByName: jest.fn(),
    } as any;

    service = new CreateService(mockRepository);
  });

  it('should create a product successfully', async () => {
    const mockProduct = { id: '1', name: 'Test Product' };
    mockRepository.create.mockResolvedValue(mockProduct as any);

    const result = await service.execute(
      { name: 'Test Product' },
      'user@example.com'
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockProduct);
  });

  it('should throw error if product already exists', async () => {
    mockRepository.findByName.mockResolvedValue({} as any);

    await expect(
      service.execute({ name: 'Duplicate' }, 'user@example.com')
    ).rejects.toThrow('Produto já existe');
  });
});
```

---

## 🔧 Configuração do Projeto

### Variáveis de Ambiente

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/backend
MONGODB_URI_DEV=mongodb://localhost:27017/backend-dev

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1d

# Server
PORT=3333
NODE_ENV=development
```

### Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor em modo dev

# Build
npm run build            # Compila TypeScript

# Produção
npm start                # Inicia servidor compilado

# Generators
npm run generate:module  # Gera novo módulo CRUD

# Code Quality
npm run lint             # Verifica código
npm run lint:fix         # Corrige problemas automaticamente
npm run prettier         # Formata código
```

---

## 📊 Performance e Escalabilidade

### Cache (Redis)

```typescript
import { RedisClient } from '@config/redis.config';

// Set cache
await RedisClient.setCache('users:123', userData, 3600);

// Get cache
const cached = await RedisClient.getCache('users:123');

// Invalidate
await RedisClient.invalidate('users:*');
```

### Bulk Operations

```typescript
// Insert many
await repository.insertMany([product1, product2, product3]);

// Update many
await repository.updateMany(
  { status: 'inactive' },
  { $set: { status: 'archived' } }
);

// Bulk write
await repository.bulkWrite([
  { updateOne: { filter: { _id: '1' }, update: { $set: { name: 'New' } } } },
  { deleteOne: { filter: { _id: '2' } } },
]);
```

### Population

```typescript
// No repository
protected readonly modelPopulated = [
  { path: 'category', select: 'name' },
  { path: 'supplier', select: 'name email' },
];

// Na query
const products = await repository.findAll({ populate: true });
```

---

## 🚦 Próximos Passos

1. ✅ **Estrutura padronizada** (Completo)
2. ✅ **Utilities organizadas** (Completo)
3. ✅ **Snippets VS Code** (Completo)
4. ✅ **CLI Generator** (Completo)
5. ⏳ **Swagger/OpenAPI** (Planejado)
6. ⏳ **Testes Automatizados** (Planejado)
7. ⏳ **Docker + Docker Compose** (Planejado)
8. ⏳ **CI/CD Pipeline** (Planejado)

---

## 📖 Documentação Adicional

- [Guia de Snippets](.vscode/SNIPPETS_GUIDE.md)
- [Padrões de Error Handling](src/shared/errors/README.md)
- [Email Service](src/shared/services/email/README.md)

---

## 🤝 Contribuindo

1. Crie um módulo usando o generator: `npm run generate:module feature-name`
2. Siga os padrões de código estabelecidos
3. Adicione testes unitários
4. Documente funcionalidades customizadas
5. Faça commit seguindo Conventional Commits

---

## 📄 Licença

Este projeto é proprietário. Todos os direitos reservados.

