# Primeiros passos — duplicando o template

Como sair deste template e ter uma API nova rodando, com autenticação e
permissionamento funcionando, em poucos minutos.

---

## 1. Copiar o template

Escolha uma das formas:

```bash
# Sem levar o histórico do template (recomendado)
npx degit augustoOliveira1993/backend-base-ts minha-api
cd minha-api
```

```bash
# Ou clonando e descartando o histórico
git clone https://github.com/augustoOliveira1993/backend-base-ts.git minha-api
cd minha-api
rm -rf .git && git init
```

Instale as dependências:

```bash
yarn
```

---

## 2. Inicializar o projeto

```bash
yarn init:project
```

O script pergunta:

| Pergunta | O que faz |
|---|---|
| **Nome do projeto** | Renomeia `package.json`, `ecosystem.config.cjs`, `docker-compose.yml` e o `README.md` |
| **Descrição** | Vai para o `package.json` e o `README.md` |
| **Preset** | `minimal`, `enterprise`, `realtime` ou `observability` — define as feature flags do `.env` |
| **Módulos** | Quais módulos opcionais manter (veja abaixo) |
| **Extras** | Pergunta `s/n` por extra. Hoje só o `EmailService` (Microsoft Graph), que **é removido por padrão** — responda `s` para mantê-lo |
| **Porta HTTP** | Porta da API |

E então:

- gera o `.env` com **`SECRET` e `REFRESH_SECRET` aleatórios** (`crypto.randomBytes`) — nenhum projeto novo nasce com o segredo do template;
- aponta `MONGODB_URI`/`MONGODB_URI_DEV` para um banco com o nome do projeto;
- remove os módulos não escolhidos, ajustando `shared/container/index.ts` e as rotas;
- apaga resíduos do template (templates de e-mail da organização de origem, `docs/history/`);
- **se auto-remove** — não deve rodar duas vezes.

### Modo não-interativo (CI)

```bash
yarn init:project --name minha-api --description "API de pedidos" \
  --preset minimal --modules log --port 3333 --yes
```

Outras flags: `--dry-run` (mostra as respostas e sai), `--keep-script` (não se auto-remove),
`--features email` (mantém o EmailService).

O script só roda uma vez: depois de inicializar ele se remove do `package.json`, e
uma segunda execução aborta em vez de apagar módulos de novo.

### Sobre o `EmailService`

Ele é **removido por padrão** — usa Microsoft Graph e carrega templates de
recrutamento da organização de origem. Nada no `src/` importa esse serviço, então
remover não quebra a compilação.

Se você mantiver (`--features email` ou respondendo `s` no prompt):

- preencha `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` e
  `MAIL_FROM_USER` no `.env`; sem isso o serviço sobe desligado e só loga um aviso;
- `EmailService.ts` importa os templates de `templates/recrutamento/` diretamente
  — **edite o conteúdo desses arquivos** em vez de apagá-los, senão o `tsc` quebra
  com `Cannot find module './templates/recrutamento/...'`.

Se removeu e depois se arrependeu, recupere do template:

```bash
git checkout HEAD -- src/shared/services/email
```

Depois de inicializar, confirme que ficou tudo de pé:

```bash
yarn typecheck
```

### Módulos

O script lista **todos** os módulos de `src/modules` (lidos dos manifestos
`module.ts`), agrupados por contexto. Na pergunta de módulos você escolhe o que
o projeto novo leva:

- `*` — mantém todos (padrão);
- `base` — pacote padrão: `users`, `session`, `log`, `notification`;
- `estoque` — pacote de estoque: base + `entrada`, `saida`, `transferencia`,
  `inventario` (e o que eles puxam: `item`, `deposito` e cadastros — **sem**
  caixa, colaborador ou hotelaria);
- lista por vírgula, misturando pacotes e módulos — ex.: `estoque,caixa`;
- `nenhum` (ou vazio) — só o mínimo compilável (`users`, `session`, `log`).

As **dependências declaradas nos manifestos entram sozinhas**: pedir `saida`
puxa `item`, `deposito`, `notification` e o restante da cadeia. As integrações
do estoque com caixa, colaborador e hotelaria são opcionais via portas
(`CaixaPort`, `ColaboradorPort`, `HospedagemPort` — ver `docs/MODULES.md`), por
isso nada disso vem junto. O que não entrou na seleção é **apagado do disco**,
e o projeto continua compilando (`yarn typecheck` confirma).

Exemplos:

```bash
# controle de estoque puro (entrada, saída, transferência, inventário)
yarn init:project --name estoque-api --modules estoque --yes

# base: só autenticação, sessão, auditoria e notificações
yarn init:project --name minha-api --modules base --yes

# estoque + frente de caixa
yarn init:project --name pdv-api --modules estoque,caixa --yes
```

> **Por que `users`/`session` são obrigatórios:** `users` (`AuthenticateUser`,
> `RefreshTokenService`, `authRouter`) e `shared/middlewares/authMiddleware`
> importam de `session` diretamente. Removê-los quebra a compilação. `session`
> só vira opcional depois da inversão de dependência (porta `ISessionStore`);
> `log` entra sempre porque `session` depende dele.

Alternativa sem apagar nada: mantenha todos os módulos e selecione em runtime
com `modules.json` ou `MODULES=` — ver [MODULES.md](MODULES.md). O `init` apaga
de verdade; o `modules.json` só escolhe o que sobe.

---

## 3. Subir a infraestrutura

```bash
yarn dev:infra     # docker compose up -d mongo redis
```

Sem Docker, aponte `MONGODB_URI_DEV` no `.env` para um Mongo já existente.
O Redis é opcional: sem ele a API sobe e o `/health` responde `207` (degradado).

---

## 4. Criar o administrador inicial

```bash
yarn seed
```

Isso cria as roles padrão (`Administrador`, `Usuario`) e o usuário administrador
com as credenciais do `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_USERNAME`).

> **Este passo não é opcional.** O `POST /api/auth/signup` sempre cria usuários com a
> role `Usuario` — não existe caminho pela API para promover alguém a administrador.
> Sem o seed, um banco novo fica sem nenhum admin.

O seed é **idempotente**: rodar de novo não duplica nada; se o e-mail já existir,
apenas garante que ele esteja na role de Administrador.

```bash
yarn seed --list            # lista os seeds disponíveis
yarn seed --only=admin      # roda um seed específico
```

---

## 5. Subir a API

```bash
yarn dev
```

Verifique:

```bash
curl localhost:3333/health
```

| Rota | Quando existe |
|---|---|
| `/health` | `FEATURE_HEALTH_CHECK=true` |
| `/metrics` | `FEATURE_METRICS=true` (formato Prometheus) |
| `/docs` e `/openapi.json` | `FEATURE_OPENAPI=true` |

---

## 6. Fazer login

```bash
curl -X POST localhost:3333/api/auth/signin \
  -H 'Content-Type: application/json' \
  -d '{"login":"admin@example.com","password":"SUA_ADMIN_PASSWORD"}'
```

Use o token retornado nas rotas protegidas:

```bash
curl localhost:3333/api/auth/me -H "Authorization: Bearer $TOKEN"
```

Detalhes do fluxo de autenticação e do modelo de permissões:
**[AUTH_AND_PERMISSIONS.md](AUTH_AND_PERMISSIONS.md)**.

---

## 7. Criar o primeiro módulo

```bash
yarn generate:module pedidos --dry-run     # mostra o que será criado
yarn generate:module pedidos
```

Gera o módulo CRUD completo (DTO, repositório, model, 5 services, controller,
router, container) e **registra automaticamente** em `shared/container/index.ts`
e nas rotas. `GET /api/pedidos` passa a responder.

Opções úteis: `--soft-delete` (exclusão lógica), `--cache` (cache Redis por rota),
`--public` (sem `verifyToken`), `--force` (sobrescreve).

---

## 8. Checagens antes de commitar

```bash
yarn typecheck
yarn lint
yarn test
yarn build
```

---

## Resumo

```bash
npx degit augustoOliveira1993/backend-base-ts minha-api && cd minha-api
yarn
yarn init:project --name minha-api --preset minimal --modules log --port 3333 --yes
yarn dev:infra
yarn seed
yarn dev
```

---

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `/health` responde `207` | Redis fora do ar. A API funciona; só o cache fica indisponível. |
| `MongoServerError` no boot | `MONGODB_URI_DEV` apontando para um Mongo inexistente. |
| `401` em toda rota | Token ausente/expirado, ou `SECRET` mudou depois do login. |
| `signin` retorna `401` com a senha certa | O seed não rodou, ou `ADMIN_PASSWORD` foi alterado no `.env` **depois** do seed (a senha fica hasheada no banco; rodar o seed de novo não a atualiza). |
| Login tenta LDAP sem querer | `DOMAIN_CONTROLLER` preenchido e o e-mail termina nesse domínio. Deixe vazio para autenticação só local. |
| Módulo removido continua no build | Rode `yarn build` (ele limpa o `dist` antes de compilar). |
