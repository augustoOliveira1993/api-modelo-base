---
name: backend-base-ts-doc-scalability-and-template-improvements
description: |
  Use this skill when you need guidance from docs/SCALABILITY_AND_TEMPLATE_IMPROVEMENTS.md in backend-base-ts.
version: 1.0.0
category: backend-development
triggers:
  - backend-base-ts-doc-scalability-and-template-improvements
  - doc-scalability-and-template-improvements
author: backend-base-ts
license: MIT
tags:
  - backend
  - nodejs
  - typescript
  - backend-base-ts
  - scalability
  - and
  - template
  - improvements
---

# Backend Base TS - Doc Scalability And Template Improvements

Use this skill when you need guidance from docs/SCALABILITY_AND_TEMPLATE_IMPROVEMENTS.md in backend-base-ts.

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

# Melhorias para tornar o projeto uma base altamente escalavel

## Objective
Apply the canonical guidance from docs/SCALABILITY_AND_TEMPLATE_IMPROVEMENTS.md without diverging from repository standards.

## When to use

- When implementing or refactoring behavior covered by this document.
- When reviewing changes that touch the same concerns.
- When validating architecture, contracts, or operational rules described here.

## Source document

- docs/SCALABILITY_AND_TEMPLATE_IMPROVEMENTS.md

## Canonical guidance

# Melhorias para tornar o projeto uma base altamente escalavel

Este documento consolida a analise do projeto `backend-base-ts` como template para iniciar novos backends Node.js/TypeScript. A base ja tem bons fundamentos: arquitetura modular, TypeScript strict, Express, Mongoose, DI com `tsyringe`, Redis, sessoes, health check, metricas Prometheus, logs, middlewares de seguranca, geradores de modulo e documentacao de arquitetura.

O objetivo agora e transformar essa base em um produto tecnico reutilizavel: facil de iniciar, seguro por padrao, observavel, testavel, extensivel e pronto para crescer em multiplos projetos.

## Diagnostico executivo

### Pontos fortes atuais

- Arquitetura modular por dominio em `src/modules`.
- Separacao razoavel entre HTTP, services, repositories, DTOs e models.
- Uso de interfaces de repositorio e DI com `tsyringe`.
- `BaseMongoRepository` reaproveitavel para CRUDs.
- Health check e metricas Prometheus ja existem.
- Redis, sessoes, rate limiter, auditoria e cache ja foram considerados.
- Scripts `generate:module` e `generate:sub-module` aceleram novos recursos.
- Build TypeScript executou com sucesso em 2026-06-07.

### Principais lacunas para uma base escalavel

- Nao ha suite de testes automatizados, apesar do README citar Jest.
- O lint esta quebrado com ESLint 9 porque o projeto ainda usa `.eslintrc.json`.
- Nao ha `Dockerfile` ou `docker-compose` para ambiente reproduzivel.
- O `server.ts` sempre tenta ler certificados HTTPS, dificultando desenvolvimento local e uso em novos projetos.
- O `.env.exemplo` contem segredo default e typo em `NODE_ENV="develoloper"`.
- O tratamento de erro 500 expoe stack trace e mensagem interna na resposta.
- O README cita Kafka e Jest, mas eles nao aparecem nas dependencias.
- O gerador de modulo ja possui baseline seguro com validacao, dry-run, schemas e esqueleto OpenAPI, mas ainda pode evoluir em testes de services/controller.
- Observabilidade existe, mas ainda precisa de correlacao por request, labels de baixa cardinalidade e padrao de logs estruturados.
- Dependencias incluem pacotes desnecessarios ou problematicos para template (`fs`, `https`, `save`, tipos duplicados e libs antigas).

## Roadmap priorizado

### P0 - Base segura e confiavel

1. Corrigir configuracao do ESLint
   - Criar `eslint.config.js` flat config compativel com ESLint 9.
   - Remover ou migrar `.eslintignore`.
   - Revisar dependencias antigas de config, como `prettier/@typescript-eslint`, que nao e mais o caminho recomendado.
   - Resultado esperado: `npm run lint` passa ou aponta problemas reais de codigo.

2. Sanitizar configuracoes de ambiente
   - Renomear `.env.exemplo` para `.env.example` ou manter ambos se houver compatibilidade.
   - Corrigir `NODE_ENV="develoloper"` para `development`.
   - Remover segredos reais ou reutilizaveis do exemplo.
   - Documentar variaveis obrigatorias, opcionais e defaults.
   - Adicionar validacao de env no boot com Zod, Joi ou envalid.

3. Tornar HTTP/HTTPS configuravel
   - Permitir iniciar em HTTP quando certificados nao existirem.
   - Usar HTTPS apenas quando `HTTPS_ENABLED=true`.
   - Validar `KEY_CERT`, `KEY_KEY` e `KEY_CA` somente quando HTTPS estiver habilitado.
   - Isso torna a base mais facil de clonar e rodar em novos projetos.

4. Proteger respostas de erro
   - Em producao, nao retornar `error`, `origin` ou stack trace no JSON de erro 500.
   - Logar detalhes internamente com `requestId`.
   - Retornar payload publico padronizado.

5. Corrigir README e documentacao divergente
   - Remover Kafka e Jest da lista de tecnologias ate eles serem implementados.
   - Atualizar `src/config` para `src/configs`.
   - Documentar MongoDB, Redis, sessoes, metricas, auth, email e geradores com o estado real.

### P1 - Testabilidade e contratos

1. Adicionar framework de testes
   - Usar Vitest ou Jest com `ts-jest`/transpile apropriado.
   - Criar testes unitarios para services sem banco real.
   - Criar testes de integracao para rotas principais com banco isolado.
   - Adicionar `npm run test`, `npm run test:watch`, `npm run test:coverage`.

2. Criar factories e mocks de repositorios
   - Mockar interfaces como `IUsersRepository`, `IRoleRepository`, `ISessionRepository`.
   - Facilitar teste de services com DI.
   - Evitar que regra de negocio dependa de Mongoose em teste unitario.

3. Adicionar validacao de entrada por rota
   - Criar middleware generico de validation schema.
   - Usar Zod, Yup ou Joi para body, params e query.
   - Gerar DTO TypeScript a partir dos schemas ou manter schemas como fonte principal.
   - Evitar confiar em `req.body` livre.

4. Padronizar contratos OpenAPI
   - Gerar `openapi.yaml` ou rota `/docs`.
   - Incluir schemas de request/response, security schemes e exemplos.
   - Fazer o gerador de modulo criar o esqueleto do contrato.

### P1 - Escalabilidade operacional

1. Reduzir cardinalidade de metricas
   - Em `MetricsService`, preferir rota normalizada (`/users/:id`) em vez de `req.path` quando possivel.
   - Evitar labels com IDs, emails ou valores dinamicos.
   - Adicionar metricas de erro por dominio e latencia de chamadas externas.

2. Adicionar request id/correlation id
   - Middleware no inicio do pipeline para gerar ou aceitar `X-Request-Id`.
   - Incluir request id em logs, erros, auditoria e resposta.
   - Facilitar debug em producao e rastreabilidade entre servicos.

3. Estruturar logs para producao
   - Preferir JSON logs em producao.
   - Remover `winston.transports.Http` sem URL configurada ou torna-lo condicional.
   - Separar logging local de logging para observabilidade centralizada.
   - Evitar `console.error` em services; usar logger.

4. Rever cache e sessoes para multiplas instancias
   - O `lastActivityCache` em memoria funciona por processo, mas nao e compartilhado entre replicas.
   - Para cluster/Kubernetes, mover debounce para Redis ou aceitar comportamento por instancia documentado.
   - Definir estrategia fail-open/fail-closed para Redis indisponivel por tipo de rota.

5. Adicionar graceful shutdown
   - Tratar `SIGTERM` e `SIGINT`.
   - Parar HTTP server, fechar MongoDB, Redis, Socket.IO e jobs.
   - Necessario para deploys em containers e Kubernetes.

### P1 - Template pronto para novos projetos

1. Criar setup reproduzivel
   - Adicionar `Dockerfile`.
   - Adicionar `docker-compose.yml` com API, MongoDB e Redis.
   - Adicionar script `npm run setup` ou `npm run dev:infra`.
   - Padronizar volumes de logs e uploads.

2. Criar checklist de bootstrap de novo projeto
   - Nome da API.
   - Modulos iniciais.
   - Banco principal.
   - Auth local, AD ou ambos.
   - Redis obrigatorio ou opcional.
   - Email habilitado ou desabilitado.
   - HTTPS local ou somente proxy reverso.

3. Transformar features em presets
   - Preset `minimal`: Express + Mongo + auth local.
   - Preset `enterprise`: AD, email Microsoft Graph, sessoes, auditoria.
   - Preset `realtime`: Socket.IO e notificacoes.
   - Preset `observability`: metrics, health, logs e request id.

4. Melhorar gerador de modulo
   - Validar nome em kebab-case.
   - Nao sobrescrever arquivos sem `--force`.
   - Gerar testes de services e controller.
   - Gerar schemas de validacao.
   - Gerar OpenAPI parcial.
   - Permitir `--public`, `--auth`, `--soft-delete`, `--cache`, `--audit`.
   - Fazer dry-run com lista de arquivos antes de escrever.

### P2 - Arquitetura e codigo

1. Fortalecer tipos do repositorio base
   - Reduzir `Record<string, any>` e `any`.
   - Separar query de filtros, pagination e sort.
   - Suportar projection/select de forma tipada.
   - Considerar `lean()` para leituras de alta escala quando nao precisar de Document completo.

2. Separar dominio de Mongoose nos DTOs
   - Hoje DTOs importam `Document`, o que acopla dominio ao banco.
   - Criar tipos separados: `IUserDTO`, `IUserEntity`, `IUserDocument`.
   - Services devem depender de entidades/DTOs, nao de `Document` quando possivel.

3. Padronizar respostas HTTP
   - Definir envelope unico para sucesso, erro, paginacao e metadata.
   - Corrigir typo `succes` na rota raiz.
   - Usar status HTTP apropriado: 201 create, 204 delete quando aplicavel, 400/401/403/404/409.

4. Implementar camadas de autorizacao
   - Hoje autenticacao esta bem presente, mas autorizacao por permissao/role deve virar middleware declarativo.
   - Exemplo: `authorize('users:create')`.
   - Integrar com `GetAbilityUserAuthService`.

5. Criar padrao para jobs/cron
   - `initCrons` esta vazio.
   - Criar pasta `src/shared/jobs` ou `src/modules/{modulo}/jobs`.
   - Usar lock distribuido com Redis para evitar job duplicado em multiplas replicas.

### P2 - Segurança

1. Revisar CORS
   - `origin: process.env.CORS` pode ser insuficiente para multiplos dominios.
   - Aceitar lista separada por virgula.
   - Bloquear `undefined` em producao.

2. Endurecer JWT e sessoes
   - Armazenar secrets com tamanho minimo validado.
   - Separar issuer/audience.
   - Considerar rotacao de refresh token.
   - Definir blacklist/denylist ou invalidacao forte por sessao.

3. Proteger endpoints sensiveis
   - `/metrics` deve ser restrito em producao ou exposto apenas em rede interna.
   - `/health` pode ter versao publica simples e versao privada detalhada.

4. Adicionar headers e limites
   - Limite de tamanho de body JSON.
   - Timeout por request.
   - Protecao contra payloads grandes em upload.

### P2 - Dados e performance

1. Indices MongoDB
   - Documentar indices esperados por model.
   - Usar `schema.index(...)` para campos de busca, unicidade e filtros frequentes.
   - Monitorar queries lentas.

2. Paginacao escalavel
   - Offset com `skip` pode degradar em colecoes grandes.
   - Manter offset para backoffice pequeno, mas adicionar cursor pagination para listas grandes.
   - Gerar helper de cursor por `_id` ou `createdAt`.

3. Soft delete consistente
   - Existe base para soft delete, mas CRUD gerado usa delete fisico.
   - Permitir `--soft-delete` no gerador.
   - Padronizar filtros para excluir deletados por default.

4. Transacoes
   - Existe `transactionManager`; documentar quando usar.
   - Criar exemplos em services que alteram multiplas colecoes.
   - Garantir rollback em falhas.

### P3 - Experiencia de desenvolvimento

1. Adicionar CI
   - Pipeline com install, lint, test, build.
   - Publicar coverage.
   - Bloquear merge com lint quebrado.

2. Adicionar hooks locais
   - Husky + lint-staged ou alternativa simples.
   - Rodar prettier/lint nos arquivos alterados.

3. Padronizar package manager
   - README usa Yarn, scripts usam npm, `load` usa yarn.
   - Escolher npm, pnpm ou yarn e documentar.
   - Versionar lockfile correspondente.

4. Melhorar README para template
   - "Como criar novo projeto a partir desta base".
   - "Como remover features enterprise".
   - "Como criar modulo".
   - "Como testar".
   - "Como subir local com Docker".

## Backlog sugerido em ordem de implementacao

1. Migrar ESLint 9 para `eslint.config.js`. **Status: iniciado/concluido como baseline pragmatica.**
2. Corrigir `.env.exemplo` e adicionar validacao de env. **Status: iniciado.**
3. Tornar HTTPS opcional. **Status: concluido.**
4. Proteger erro 500 em producao. **Status: concluido.**
5. Atualizar README para refletir dependencias reais. **Status: concluido.**
6. Adicionar testes com Vitest/Jest e exemplos de mocks. **Status: iniciado com baseline em `node --test`.**
7. Adicionar Dockerfile e docker-compose com MongoDB e Redis. **Status: concluido.**
8. Implementar request id e logs estruturados. **Status: concluido como baseline.**
9. Melhorar metricas para evitar alta cardinalidade. **Status: concluido como baseline.**
10. Evoluir gerador de modulo com validacao, dry-run, testes e schemas. **Status: concluido como baseline com validacao de nome, `--dry-run`, protecao contra sobrescrita, `--force`, schemas de validacao HTTP, testes do gerador e opcoes `--public`, `--cache`, `--soft-delete`.**
11. Adicionar OpenAPI. **Status: concluido como baseline com `/openapi.json`, `/docs`, security scheme JWT, schemas base e esqueleto OpenAPI no gerador.**
12. Adicionar graceful shutdown. **Status: concluido com handlers `SIGTERM`/`SIGINT`, timeout configuravel, fechamento de HTTP/HTTPS, cron tasks, Socket.IO, Redis, Sequelize e MongoDB.**
13. Criar presets de template. **Status: concluido com script `npm run preset`, presets `minimal`, `enterprise`, `realtime` e `observability`, documentacao e testes.**
14. Implementar cursor pagination. **Status: concluido com helpers `applyCursorPaginationParams`/`buildCursorPaginatedResult`, filtro seek no repositório Mongo base e soft-delete, OpenAPI, gerador atualizado e testes.**
15. Implementar autorizacao declarativa por permissao. **Status: concluido com middleware `authorize('recurso:acao')`, suporte a admin, `*`, `recurso:*`, rota sensivel protegida, gerador atualizado e testes.**

## Evidencias da analise

- `npm run build` passou com TypeScript e `tscpaths`.
- `npm run lint` falhou antes de analisar codigo porque ESLint 9 nao encontra `eslint.config.js`.
- Nao foram encontrados arquivos `Dockerfile`, `docker-compose`, `jest`, `vitest`, `*.test.ts` ou `*.spec.ts`.
- O README menciona KafkaJS e Jest, mas o `package.json` nao inclui `kafkajs`, `jest` ou alternativas de teste.
- `server.ts` le certificados via `readFileSync(process.env.KEY_KEY)` e `readFileSync(process.env.KEY_CERT)` antes de qualquer feature flag de HTTPS.
- `ErrorMiddleware` retorna stack trace em `origin` para erro 500.
- `MetricsService` usa `req.route?.path ?? req.path`; quando `req.route` nao estiver disponivel, `req.path` pode carregar valores dinamicos.
- `generate-module.ts` cria arquivos e altera container/rotas, mas nao valida nome, nao tem dry-run, nao gera teste e usa escrita direta sem protecao contra sobrescrita.

## Definicao de "base pronta" recomendada

Considere a base pronta para iniciar novos projetos quando estes comandos forem confiaveis:

```bash
npm install
npm run lint
npm run test
npm run build
docker compose up
npm run generate:module exemplo -- --dry-run
```

E quando estes artefatos existirem:

- `.env.example` sem segredos reais.
- `Dockerfile` e `docker-compose.yml`.
- `eslint.config.js` compativel com ESLint 9.
- Suite minima de testes.
- OpenAPI ou documentacao de contratos.
- Guia de bootstrap para novo projeto.
- Skill Codex do template em `.codex/skills/backend-base-ts-template`.

