---
name: backend-base-ts-doc-redis-cache-guide
description: |
  Use this skill when you need guidance from docs/REDIS_CACHE_GUIDE.md in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-doc-redis-cache-guide
  - doc-redis-cache-guide
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - redis
  - cache
  - guide
---

# Backend Base TS - Doc Redis Cache Guide

Use this skill when you need guidance from docs/REDIS_CACHE_GUIDE.md in backend-base-ts.

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

# Guia de Uso do Cache com Redis

## Objective
Apply the canonical guidance from docs/REDIS_CACHE_GUIDE.md without diverging from repository standards.

## When to use

- When implementing or refactoring behavior covered by this document.
- When reviewing changes that touch the same concerns.
- When validating architecture, contracts, or operational rules described here.

## Source document

- docs/REDIS_CACHE_GUIDE.md

## Canonical guidance

# Guia de Uso do Cache com Redis

## Visão Geral

O `RedisClient` oferece duas formas de uso:

- **`ScopedCache`** — forma recomendada para serviços. Criada via `RedisClient.for(prefix, ttl)`, encapsula prefixo e TTL e expõe uma API mínima de 4 métodos.
- **API estática direta** — para casos avançados com controle total (TTL dinâmico, invalidação condicional).

---

## Forma Recomendada — `ScopedCache`

Declare o helper uma vez no topo do módulo e chame métodos simples em cada operação.

```typescript
// Declaração única por módulo (fora da classe)
const cache = RedisClient.for('/notifications', 60);
```

### Leituras

```typescript
// Listagem com filtros/query params
const data = await cache.remember(query, () => repo.findAll(query));

// Busca por ID
const item = await cache.rememberById(id, () => repo.findById(id));

// Operação pesada com proteção contra cache stampede
const report = await cache.rememberWithLock(
  query,
  () => service.generateHeavyReport(query),
  { lockTtl: 30, retryDelay: 200, maxRetries: 75 },
);
```

### Invalidação (após mutations)

```typescript
await cache.invalidate(); // limpa listagens e detalhes do prefixo
```

### Exemplo completo — módulo de notificações

```typescript
// services/notification/FindAllService.ts
const cache = RedisClient.for('/notifications', 60);

public async execute(query) {
  return cache.remember(query, () => this.repository.findAll(query));
}
```

```typescript
// services/notification/FindByIdService.ts
const cache = RedisClient.for('/notifications', 120);

public async execute(id: string) {
  return cache.rememberById(id, async () => {
    const item = await this.repository.findById(id);
    if (!item) throw new NotFoundError({ message: 'Não encontrado' });
    return item;
  });
}
```

```typescript
// services/notification/CreateService.ts
const cache = RedisClient.for('/notifications');

public async execute(data, userEmail) {
  const created = await this.repository.create({ ...data, created_by: userEmail });
  await cache.invalidate();
  return created;
}
```

### Adicionando cache a um novo módulo

Apenas uma linha nova por service:

```typescript
const cache = RedisClient.for('/users', 120);
```

---

## Referência — `ScopedCache`

| Método                                           | Uso                              | Invalidação automática |
| ------------------------------------------------ | -------------------------------- | ---------------------- |
| `cache.remember(params, factory)`                | Listagens, queries paginadas     | Não                    |
| `cache.rememberById(id, factory)`                | Busca por ID                     | Não                    |
| `cache.rememberWithLock(params, factory, opts?)` | Operações pesadas / alto tráfego | Não                    |
| `cache.invalidate()`                             | Após create / update / delete    | —                      |

**`invalidate()`** cobre automaticamente tanto as chaves de listagem (`/prefixo`) quanto as de detalhe (`/prefixo/detail`) com um único `SCAN`.

---

## Forma Avançada — API Estática Direta

Use quando precisar de controle manual: TTL dinâmico baseado no conteúdo, invalidação condicional, ou acesso direto a chaves individuais.

```typescript
// Gerar chave
const key = RedisClient.getDynamicHashKey('/users', req.params, req.query);

// Leitura manual
const cached = await RedisClient.getCache(key);
if (cached) return res.json(cached);

const data = await usersRepository.findAll(filters);
await RedisClient.setCache(key, data, 60);
return res.json(data);

// Deletar chave específica
await RedisClient.deleteCache(key);

// Invalidar por prefixo
await RedisClient.clearCacheByPrefix('/users');

// Cache-aside com 5 argumentos (base do ScopedCache)
await RedisClient.remember<User[]>('/users', {}, query, 60, () => repo.findAll());

// Cache-aside com mutex distribuído
await RedisClient.rememberWithLock<Report>(
  '/reports/vendas',
  {},
  query,
  300,
  () => service.generate(),
  { lockTtl: 30, retryDelay: 200, maxRetries: 75 },
);
```

### Como o mutex distribuído funciona

```
Requisição A (miss) ──► adquire lock (SET NX EX) ──► executa factory ──► popula cache ──► libera lock
Requisição B (miss) ──► tenta lock (falha) ──► polling ──► encontra cache populado ──► retorna
Requisição C (miss) ──► tenta lock (falha) ──► polling ──► encontra cache populado ──► retorna
```

---

## Escolha do Método

```
Novo módulo / caso comum
  └─► RedisClient.for(prefix, ttl)  →  cache.remember / rememberById / invalidate

Operação pesada + alto tráfego simultâneo
  └─► cache.rememberWithLock(params, factory, opts)

TTL dinâmico / invalidação condicional / acesso a chave individual
  └─► API estática direta (getCache / setCache / deleteCache)
```

---

## Convenção de Prefixos

| Módulo       | Prefixo                   |
| ------------ | ------------------------- |
| Notificações | `/notifications`          |
| Usuários     | `/users`                  |
| Roles        | `/users/roles`            |
| Logs         | `/logs`                   |
| Relatórios   | `/reports/nome-relatorio` |

O `invalidate()` usa `CACHE{prefix}*` como padrão, então `/notifications` cobre tanto `/notifications` (listagem) quanto `/notifications/detail` (por ID).

---

## TTL Recomendado

| Tipo de dado                          | TTL       |
| ------------------------------------- | --------- |
| Dados voláteis (notificações, status) | 10–60s    |
| Listagens paginadas                   | 60–120s   |
| Dados de configuração                 | 300–600s  |
| Relatórios pesados                    | 300–3600s |

Sempre defina TTL. Chaves sem expiração acumulam e causam pressão de memória em produção.

---

## Variáveis de Ambiente

| Variável         | Padrão      | Descrição                            |
| ---------------- | ----------- | ------------------------------------ |
| `REDIS_HOST`     | `127.0.0.1` | Host do servidor Redis               |
| `REDIS_PORT`     | `6379`      | Porta do servidor Redis              |
| `REDIS_PASSWORD` | —           | Senha (opcional)                     |
| `REDIS_DB`       | `0`         | Database index                       |
| `REDIS_TLS`      | `false`     | Habilitar TLS (`'true'` para ativar) |

---

## Referência Completa da API

```typescript
// Criar ScopedCache (forma recomendada)
RedisClient.for(prefix, ttl?): ScopedCache

// ScopedCache
cache.remember<T>(keyParams, factory): Promise<T>
cache.rememberById<T>(id, factory): Promise<T>
cache.rememberWithLock<T>(keyParams, factory, options?): Promise<T>
cache.invalidate(): Promise<void>

// API estática direta (avançado)
RedisClient.getDynamicHashKey(prefix, routeParams?, queryParams?): string
RedisClient.getCache(hashKey): Promise<T | null>
RedisClient.setCache(hashKey, data, expiration?): Promise<void>
RedisClient.deleteCache(hashKey): Promise<void>
RedisClient.clearCacheByPrefix(prefix): Promise<void>
RedisClient.remember<T>(prefix, routeParams, queryParams, expiration, factory): Promise<T>
RedisClient.rememberWithLock<T>(prefix, routeParams, queryParams, expiration, factory, options?): Promise<T>
// options: { lockTtl?: number, retryDelay?: number, maxRetries?: number }
```

