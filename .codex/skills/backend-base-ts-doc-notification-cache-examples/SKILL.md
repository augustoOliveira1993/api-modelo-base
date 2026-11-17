---
name: backend-base-ts-doc-notification-cache-examples
description: |
  Use this skill when you need guidance from docs/NOTIFICATION_CACHE_EXAMPLES.md in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-doc-notification-cache-examples
  - doc-notification-cache-examples
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - notification
  - cache
  - examples
---

# Backend Base TS - Doc Notification Cache Examples

Use this skill when you need guidance from docs/NOTIFICATION_CACHE_EXAMPLES.md in backend-base-ts.

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

# Exemplos para Testar o Cache de Notificações

## Objective
Apply the canonical guidance from docs/NOTIFICATION_CACHE_EXAMPLES.md without diverging from repository standards.

## When to use

- When implementing or refactoring behavior covered by this document.
- When reviewing changes that touch the same concerns.
- When validating architecture, contracts, or operational rules described here.

## Source document

- docs/NOTIFICATION_CACHE_EXAMPLES.md

## Canonical guidance

# Exemplos para Testar o Cache de Notificações

Substitua `BASE_URL` pelo endereço do servidor (ex.: `http://localhost:3000`) e `TOKEN` pelo JWT válido.

---

## Fluxo de Teste Recomendado

```
1. GET /notifications          → MISS (popula cache)
2. GET /notifications          → HIT  (retorna do cache, mais rápido)
3. POST /notifications         → cria e invalida o cache
4. GET /notifications          → MISS novamente (cache foi limpo)
5. GET /notifications/:id      → MISS (popula cache de detalhe)
6. GET /notifications/:id      → HIT
7. PUT /notifications/:id      → atualiza e invalida o cache
8. GET /notifications/:id      → MISS novamente
9. POST /notifications/:id/read → marca como lido e invalida
10. DELETE /notifications/:id  → deleta e invalida
```

Observe os logs do servidor: `HIT: CACHE/notifications:...` ou `MISS: CACHE/notifications:...`.

---

## 1. Listar Notificações (GET)

**Cache miss** na primeira chamada, **hit** na segunda.

```http
GET /notifications
Authorization: Bearer TOKEN
```

Com paginação:
```http
GET /notifications?page=1&limit=10
Authorization: Bearer TOKEN
```

---

## 2. Buscar por ID (GET)

```http
GET /notifications/683a1f2e4c0d3b1a2e5f7890
Authorization: Bearer TOKEN
```

---

## 3. Criar Notificação — invalida o cache (POST)

Notificação simples de alerta:
```json
POST /notifications
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "title": "Manutenção programada",
  "message": "O sistema ficará indisponível das 02:00 às 04:00.",
  "type": "warning"
}
```

Notificação com ações (botões):
```json
POST /notifications
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "title": "Novo pedido recebido",
  "message": "Você tem um novo pedido aguardando aprovação.",
  "type": "info",
  "actions": [
    {
      "type": "button",
      "label": "Aprovar",
      "action": "approve_order",
      "method": "POST",
      "payload": { "orderId": "abc123" },
      "style": "success"
    },
    {
      "type": "button",
      "label": "Recusar",
      "action": "reject_order",
      "method": "POST",
      "payload": { "orderId": "abc123" },
      "style": "danger"
    }
  ]
}
```

Notificação com link e expiração:
```json
POST /notifications
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "title": "Relatório disponível",
  "message": "Seu relatório mensal foi gerado e está pronto para download.",
  "type": "success",
  "expiresAt": "2026-04-30T23:59:59.000Z",
  "metadata": {
    "reportId": "rpt_2026_04",
    "size": "2.3MB"
  },
  "actions": [
    {
      "type": "link",
      "label": "Baixar relatório",
      "url": "/api/reports/rpt_2026_04/download",
      "style": "primary"
    }
  ]
}
```

---

## 4. Atualizar Notificação — invalida o cache (PUT)

```json
PUT /notifications/683a1f2e4c0d3b1a2e5f7890
Authorization: Bearer TOKEN
Content-Type: application/json

{
  "title": "Manutenção atualizada",
  "message": "A manutenção foi remarcada para as 03:00.",
  "type": "alert"
}
```

---

## 5. Marcar como Lida — invalida o cache (POST)

```http
POST /notifications/683a1f2e4c0d3b1a2e5f7890/read
Authorization: Bearer TOKEN
```

---

## 6. Marcar Todas como Lidas — invalida o cache (POST)

```http
POST /notifications/mark-all-read
Authorization: Bearer TOKEN
```

---

## 7. Deletar Notificação — invalida o cache (DELETE)

```http
DELETE /notifications/683a1f2e4c0d3b1a2e5f7890
Authorization: Bearer TOKEN
```

---

## Verificando o Cache via Redis CLI

```bash
# Listar todas as chaves de cache de notificações
redis-cli KEYS "CACHE/notifications*"

# Ver o conteúdo de uma chave específica
redis-cli GET "CACHE/notifications:<hash>:<hash>"

# Ver o TTL restante de uma chave
redis-cli TTL "CACHE/notifications:<hash>:<hash>"

# Limpar manualmente todas as chaves de notificação
redis-cli --scan --pattern "CACHE/notifications*" | xargs redis-cli DEL
```

---

## TTLs Configurados

| Operação              | Service                | TTL  | Comportamento              |
| --------------------- | ---------------------- | ---- | -------------------------- |
| `GET /`               | `FindAllService`       | 60s  | `remember` (cache-aside)   |
| `GET /:id`            | `FindByIdService`      | 120s | `remember` (cache-aside)   |
| `POST /`              | `CreateService`        | —    | Invalida `/notifications*` |
| `PUT /:id`            | `UpdateService`        | —    | Invalida `/notifications*` |
| `DELETE /:id`         | `DeleteService`        | —    | Invalida `/notifications*` |
| `POST /:id/read`      | `ReadNotifyService`    | —    | Invalida `/notifications*` |
| `POST /mark-all-read` | `ReadAllNotifyService` | —    | Invalida `/notifications*` |

