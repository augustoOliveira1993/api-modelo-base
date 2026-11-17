---
name: backend-base-ts-doc-session-mongodb-migration
description: |
  Use this skill when you need guidance from docs/SESSION_MONGODB_MIGRATION.md in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-doc-session-mongodb-migration
  - doc-session-mongodb-migration
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - session
  - mongodb
  - migration
---

# Backend Base TS - Doc Session Mongodb Migration

Use this skill when you need guidance from docs/SESSION_MONGODB_MIGRATION.md in backend-base-ts.

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

# Migração de Sessões: Redis → MongoDB

## Objective
Apply the canonical guidance from docs/SESSION_MONGODB_MIGRATION.md without diverging from repository standards.

## When to use

- When implementing or refactoring behavior covered by this document.
- When reviewing changes that touch the same concerns.
- When validating architecture, contracts, or operational rules described here.

## Source document

- docs/SESSION_MONGODB_MIGRATION.md

## Canonical guidance

# Migração de Sessões: Redis → MongoDB

## 🔄 Mudança Realizada

O sistema de sessões foi **migrado do Redis para MongoDB** para garantir estabilidade e evitar problemas de conexão.

## 📋 Arquivos Criados

### 1. **Model MongoDB** - `Session.ts`
```typescript
src/modules/session/infra/mongo/models/Session.ts
```

**Schema:**
- `sessionId` (String, unique, indexed)
- `userId` (String, indexed)
- `email` (String)
- `ip` (String)
- `userAgent` (String)
- `location` (Object: country, region, city, lat, lon, timezone)
- `createdAt` (Date)
- `lastActivityAt` (Date)
- `expiresAt` (Date, indexed com TTL)
- `isActive` (Boolean)

**Índices Criados:**
- `{ sessionId: 1 }` - busca rápida por sessão
- `{ userId: 1 }` - busca por usuário
- `{ userId: 1, isActive: 1, expiresAt: 1 }` - listagem otimizada
- `{ sessionId: 1, isActive: 1 }` - validação de sessão
- `{ expiresAt: 1 }` com `expireAfterSeconds: 0` - **TTL automático** (MongoDB remove sessões expiradas)

### 2. **Repository MongoDB** - `SessionMongoRepository.ts`
```typescript
src/modules/session/repositories/implementations/SessionMongoRepository.ts
```

**Métodos Implementados:**
- `create()` - Cria nova sessão
- `findById()` - Busca sessão por ID
- `findByUserId()` - Lista sessões ativas do usuário
- `invalidate()` - Marca sessão como inativa
- `invalidateAll()` - Invalida todas as sessões do usuário
- `updateLastActivity()` - Atualiza timestamp de atividade
- `isActive()` - Verifica se sessão está ativa e não expirou

### 3. **Container Atualizado**
```typescript
// ANTES (Redis)
import SessionRedisRepository from '../repositories/implementations/SessionRedisRepository';
container.registerSingleton<ISessionRepository>('SessionRepository', SessionRedisRepository);

// AGORA (MongoDB)
import SessionMongoRepository from '../repositories/implementations/SessionMongoRepository';
container.registerSingleton<ISessionRepository>('SessionRepository', SessionMongoRepository);
```

## ✅ Vantagens do MongoDB

1. **Já está funcionando** - MongoDB já está configurado e estável no projeto
2. **TTL automático** - Sessões expiradas são removidas automaticamente
3. **Queries complexas** - Suporta filtros avançados (`isActive`, `expiresAt`, etc)
4. **Persistência** - Dados não são perdidos em restart (diferente do Redis)
5. **Índices otimizados** - Performance similar ao Redis para este caso de uso
6. **Sem dependência extra** - Não precisa de serviço Redis rodando

## 🔧 Comportamento do Sistema

### Login
```typescript
1. Invalida todas as sessões anteriores do usuário
   → Session.updateMany({ userId, isActive: true }, { isActive: false })

2. Cria nova sessão
   → Session.create({ sessionId: uuid(), userId, email, ip, userAgent, location, ... })

3. Gera token JWT com sessionId
   → { id, email, role, sessionId, ... }
```

### Validação (authMiddleware)
```typescript
1. Decodifica token JWT
2. Extrai sessionId
3. Verifica no MongoDB:
   → Session.findOne({ sessionId, isActive: true, expiresAt: { $gt: new Date() } })
4. Se ativa → permite acesso
5. Se inativa/expirada → rejeita (401)
```

### Logout
```typescript
// Logout individual
Session.updateOne({ sessionId }, { isActive: false })

// Logout de todas as sessões
Session.updateMany({ userId, isActive: true }, { isActive: false })
```

### Limpeza Automática
```typescript
// MongoDB TTL index remove automaticamente sessões expiradas
{ expiresAt: 1 }, { expireAfterSeconds: 0 }
```

## 📊 Performance

### Comparação Redis vs MongoDB (para sessões)

| Operação          | Redis  | MongoDB              |
| ----------------- | ------ | -------------------- |
| Criar sessão      | ~1ms   | ~2-5ms               |
| Validar sessão    | ~1ms   | ~2-5ms (com índices) |
| Invalidar sessão  | ~1ms   | ~2-5ms               |
| Listar sessões    | ~5ms   | ~5-10ms              |
| Limpeza expiradas | Manual | **Automático**       |

**Conclusão:** MongoDB é ligeiramente mais lento, mas totalmente aceitável para este caso de uso (< 10ms).

## 🚀 Como Testar

### 1. Login
```bash
POST /auth/signin
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}

# Resposta
{
  "token": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "sessionId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  ...
}
```

### 2. Verificar Sessão no MongoDB
```javascript
db.sessions.find({ userId: "123" })
```

### 3. Fazer Requisição Autenticada
```bash
GET /auth/me
Authorization: Bearer eyJhbGc...

# Se sessão ativa → 200 OK
# Se sessão inativa → 401 Unauthorized
```

### 4. Logout
```bash
DELETE /auth/logout
Authorization: Bearer eyJhbGc...

# Marca sessão como inativa no MongoDB
```

### 5. Verificar Invalidação
```javascript
db.sessions.find({ sessionId: "f47ac10b..." })
// { ..., isActive: false }
```

## 🔒 Segurança

### Sessão Única por Usuário
```typescript
// Em cada login:
await Session.updateMany({ userId }, { isActive: false })  // Invalida antigas
await Session.create({ userId, ... })                      // Cria nova
```

**Resultado:**
- Login no dispositivo A → sessão criada
- Login no dispositivo B → sessão A invalidada automaticamente
- Requisições com token A → rejeitadas (sessão inativa)

### TTL (Time To Live)
```typescript
// Sessão expira automaticamente após o tempo configurado
expiresAt: new Date(now.getTime() + expiresIn)

// MongoDB remove automaticamente após expiração
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
```

## 📝 Arquivos Mantidos (Referência)

- `SessionRedisRepository.ts` - **NÃO USADO** mas mantido para referência
- Pode ser removido posteriormente se confirmado que MongoDB está estável

## 🎯 Próximos Passos

1. ✅ Sistema de sessões funcionando com MongoDB
2. ✅ Login cria sessão automaticamente
3. ✅ Logout invalida sessão
4. ✅ Validação obrigatória em cada requisição
5. ✅ TTL automático (limpeza de sessões expiradas)

**Sistema pronto para uso!** 🚀

