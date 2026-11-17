# Documentação

## Começando

| Guia | Para quê |
|---|---|
| **[GETTING_STARTED.md](GETTING_STARTED.md)** | Duplicar o template e ter uma API nova rodando. **Comece por aqui.** |
| **[AUTH_AND_PERMISSIONS.md](AUTH_AND_PERMISSIONS.md)** | Login, JWT, sessão, roles, permissões e como proteger rotas. |
| [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) | Padrões de código, estrutura de módulos, geradores e snippets. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Camadas, injeção de dependência e decisões de arquitetura. |
| [MODULES.md](MODULES.md) | Manifesto de módulo, registro e feature flags. |
| [BOUNDARIES.md](BOUNDARIES.md) | Contextos delimitados, regras entre módulos e o roadmap multi-vertical. |
| **[NOVO_VERTICAL.md](NOVO_VERTICAL.md)** | Passo a passo para adicionar um ramo de negócio novo (contexto + módulos), com exemplo de ponta a ponta. |

## Referência

| Guia | Assunto |
|---|---|
| [AUTH_ROUTES_GUIDE.md](AUTH_ROUTES_GUIDE.md) | Detalhamento das rotas de autenticação |
| [REDIS_CACHE_GUIDE.md](REDIS_CACHE_GUIDE.md) | `ScopedCache`, `remember`, invalidação |
| [NOTIFICATION_CACHE_EXAMPLES.md](NOTIFICATION_CACHE_EXAMPLES.md) | Exemplos de cache aplicados ao módulo de notificações |
| [LOG_ENUMS_GUIDE.md](LOG_ENUMS_GUIDE.md) | Categorias e ações da trilha de auditoria |
| [TEMPLATE_PRESETS.md](TEMPLATE_PRESETS.md) | Presets `minimal`, `enterprise`, `realtime`, `observability` |
| [Como_trocar_repository_tsyringe.md](Como_trocar_repository_tsyringe.md) | Trocar a implementação de um repositório via container |
| [LEVANTAMENTO_BASE_MODULAR.md](LEVANTAMENTO_BASE_MODULAR.md) | Levantamento da base modular e plano do monólito modular |

## Receitas

| Receita | Quando usar |
|---|---|
| [recipes/sequelize.md](recipes/sequelize.md) | Ler de um banco SQL secundário (MySQL/SQL Server) além do Mongo |

## Histórico

[`history/`](history/) guarda relatórios de refatorações passadas do template.
São registros de contexto, não instruções — projetos derivados podem apagar a pasta
(o `yarn init:project` já faz isso).

---

## Caminho rápido

```bash
# projeto novo
npx degit augustoOliveira1993/backend-base-ts minha-api && cd minha-api
yarn && yarn init:project
yarn dev:infra && yarn seed && yarn dev

# primeiro módulo
yarn generate:module pedidos

# antes de commitar
yarn typecheck && yarn lint && yarn test && yarn build
```
