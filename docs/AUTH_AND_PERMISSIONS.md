# Autenticação e permissionamento

Como funciona o que já vem pronto no template: login, JWT, sessão, roles e
permissões — e como proteger as rotas dos seus módulos.

---

## Visão geral

```
POST /api/auth/signin
        │
        ├─ e-mail no domínio do AD?  ──sim──►  autentica via LDAP
        │                                          │
        └──não──►  autentica local (bcrypt)        │
                          │                        │
                          └────────┬───────────────┘
                                   ▼
                       cria sessão + emite JWT
                                   ▼
                   { token, refreshToken, user, abilities }

Requisição protegida
        │
        ▼
   verifyToken ──► valida JWT ──► valida sessão ──► req.userId
        │
        ▼
   @RequiredPermission(ACL.pedidos.criar)
        │
        ▼
   defineRoutes ──► authorize(...) ──► carrega abilities ──► permite ou 403
```

---

## Autenticação

### Rotas

| Método | Rota | Protegida | O que faz |
|---|---|---|---|
| `POST` | `/api/auth/signup` | não | Cria usuário (sempre com role `Usuario`) |
| `POST` | `/api/auth/signin` | não | Login. Retorna `token` e `refreshToken` |
| `POST` | `/api/auth/refresh` | não | Novo `token` a partir do `refreshToken` |
| `GET` | `/api/auth/me` | sim | Dados do usuário autenticado |
| `GET` | `/api/auth/abilities` | sim | Permissões efetivas do usuário |
| `GET` | `/api/auth/sessions` | sim | Sessões ativas |
| `GET` | `/api/auth/sessions/current` | sim | Sessão atual |
| `DELETE` | `/api/auth/logout` | sim | Encerra a sessão atual |
| `DELETE` | `/api/auth/logout-all` | sim | Encerra todas as sessões |

### Login

`signin` aceita `login`, `email` ou `username` — os três caem no mesmo campo:

```bash
curl -X POST localhost:3333/api/auth/signin \
  -H 'Content-Type: application/json' \
  -d '{"login":"admin@example.com","password":"..."}'
```

Nas rotas protegidas:

```
Authorization: Bearer <token>
```

### Active Directory (opcional)

Se `DOMAIN_CONTROLLER` estiver preenchido, logins cujo e-mail termine nesse
domínio são autenticados via LDAP; os demais, localmente.

```dotenv
AD_URL=ldap://servidor-ad:389
DOMAIN_CONTROLLER=empresa.com.br
# Contas do domínio que ainda assim autenticam localmente (ex.: integrações)
AD_LOCAL_FALLBACK_ACCOUNTS=integracao@empresa.com.br
```

**Deixe `DOMAIN_CONTROLLER` vazio** para autenticação exclusivamente local.

### Expiração

Configurável em `src/configs/auth/jwt.config.ts` (padrão: token 8h, refresh 12h).
Cada usuário pode ter o seu próprio prazo via o campo `tempo_expiracao_token`.

### Sessão

Cada login cria um registro de sessão no Mongo. O `verifyToken` valida **o JWT e
a sessão** — por isso o logout remoto funciona: encerrada a sessão, o token para
de ser aceito mesmo sem ter expirado.

A `lastActivityAt` é atualizada com _debounce_ (padrão 60s) para não escrever no
banco a cada requisição.

---

## Permissionamento

### Os três níveis

**1. Role** — `Administrador` ou `Usuario`, criadas automaticamente.
Quem está na role `Administrador` **ignora toda checagem de permissão**
(`req.is_admin = true`).

**2. Permissões** — documentos `Permissao` com um campo `name`, ligados ao
usuário. A convenção é `recurso:acao`:

```
pedidos:create   pedidos:read   pedidos:update   pedidos:delete
```

**3. Abilities** — o array de `name` das permissões do usuário, resolvido a cada
requisição e cacheado em `req.abilities` durante o ciclo.

### Curingas

`hasRequiredPermissions` entende dois curingas:

| Permissão do usuário | Concede |
|---|---|
| `pedidos:create` | exatamente `pedidos:create` |
| `pedidos:*` | qualquer ação em `pedidos` |
| `*` | tudo |

### Protegendo rotas

```ts
import { defineRoutes } from '@shared/infra/https/routes/defineRoutes';
import { verifyToken } from '@shared/middlewares/authMiddleware';
import { RequiredPermission } from '@shared/permissions/RequiredPermission';
import { Request, Response } from 'express';

// src/modules/pedidos/permissions/ACL.ts
export const ACL = {
  pedidos: {
    criar: 'pedidos:create',
    ver: 'pedidos:read',
  },
} as const;

class PedidosController {
  @RequiredPermission(ACL.pedidos.ver)
  public async findAll(_req: Request, res: Response): Promise<Response> {
    return res.json([]);
  }

  @RequiredPermission(ACL.pedidos.criar)
  public async create(_req: Request, res: Response): Promise<Response> {
    return res.status(201).json({});
  }
}

const controller = new PedidosController();

export default defineRoutes({
  authentication: [verifyToken],
  beforeMiddleware: [],
  afterMiddleware: [],
  routes: [
    { method: 'GET', path: '/', middleware: [], handler: controller.findAll },
    { method: 'POST', path: '/', middleware: [], handler: controller.create },
  ],
});
```

O decorator pode receber várias permissões; todas precisam estar concedidas.
`defineRoutes` aplica `authorize` depois da autenticação e antes dos middlewares
específicos da rota. Mantenha os campos `authentication`, `beforeMiddleware`,
`afterMiddleware` e `middleware` como arrays. Rotas públicas declaram
`auth: false` explicitamente e não podem ter decorator de permissão.

### Criando e atribuindo permissões

```bash
# 1. Criar a permissão
curl -X POST localhost:3333/api/permissoes \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"pedidos:create"}'

# 2. Atribuir ao usuário
curl -X POST localhost:3333/api/users/<userId>/permissions \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"permissoes":["<permissaoId>"]}'

# 3. Conferir
curl localhost:3333/api/auth/abilities -H "Authorization: Bearer $TOKEN_DO_USUARIO"
```

Para remover: `DELETE /api/users/<userId>/permissions`.

Também existem **grupos de permissão** (`/api/permissao-grupos`) para organizar
permissões por conjunto em vez de atribuir uma a uma.

---

## Pontos de atenção

Coisas que o template **não** resolve por você e que valem revisão antes de ir
para produção:

### Quase todas as rotas nativas só checam autenticação

Dos módulos que já vêm no template, **apenas a rota de atribuição de permissão
a papel declara autorização por ACL**:

```ts
// src/modules/users/infra/https/controllers/RoleController.ts
@RequiredPermission(ACL.roles.permissions.update)
public addPermissionByRoleId(...) { ... }
```

As demais rotas protegidas usam `verifyToken` sem ACL; `/api/notifications` e
algumas rotas de cadastro continuam públicas conforme o comportamento atual. Na
prática, **qualquer usuário autenticado consegue listar e alterar os recursos
protegidos que ainda não declaram uma permissão**.

A máquina de RBAC está pronta e testada. Para aplicar ACL a uma rota de um
módulo, adicione a chave ao catálogo local e marque o método do controller:

```ts
// src/modules/users/permissions/ACL.ts
export const ACL = { users: { ver: 'users:read', atualizar: 'users:update' } } as const;

// src/modules/users/infra/https/controllers/UsersController.ts
@RequiredPermission(ACL.users.ver)
public findAll(...) { ... }
```

### Criação de usuário está aberta

Há **duas** rotas públicas que criam usuário: `POST /api/auth/signup` e
`POST /api/users`. Se o seu produto não tem cadastro aberto, proteja ou remova
ambas.

### O admin depende do seed

`signup` sempre atribui a role `Usuario`. O único caminho para o primeiro
administrador é `yarn seed`. Ao trocar `ADMIN_PASSWORD` no `.env` depois do seed,
a senha no banco **não** muda — ela já foi hasheada.

### Sem permissão, sem bloqueio

`defineRoutes` só nega por permissão quando o método declara
`@RequiredPermission`. Rota protegida sem decorator continua liberada para
qualquer usuário autenticado — revise cada rota conforme as regras do produto.

---

## Referência rápida

| Peça | Arquivo |
|---|---|
| `defineRoutes` | `src/shared/infra/https/routes/defineRoutes.ts` |
| `RequiredPermission` | `src/shared/permissions/RequiredPermission.ts` |
| `verifyToken`, `generateToken`, `generateRefreshToken` | `src/shared/middlewares/authMiddleware.ts` |
| `authorize`, `authorizeAdmin`, `hasRequiredPermissions` | `src/shared/middlewares/authorizeMiddleware.ts` |
| Login, AD, sessão | `src/modules/users/services/auth/AuthenticateUser.ts` |
| Resolução de abilities | `src/modules/users/services/auth/GetAbilityUserAuthService.ts` |
| Roles padrão | `src/modules/users/services/role/CreateRoleDefaultService.ts` |
| Expiração e segredos | `src/configs/auth/jwt.config.ts` |
| Admin inicial | `src/configs/seeds/admin.seed.ts` |

### Campos que o `verifyToken` injeta na request

| Campo | Conteúdo |
|---|---|
| `req.userId` | id do usuário autenticado |
| `req.userEmail` | e-mail do usuário |
| `req.sessionId` | id da sessão |
| `req.abilities` | permissões (preenchido pelo middleware de autorização) |
| `req.is_admin` | `true` se a role for `Administrador` |
