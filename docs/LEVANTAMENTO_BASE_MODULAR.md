# Levantamento — base (auth + session) com módulos instaláveis

Data: 2026-07-29. Branch: `fix/dependabot-alerts`.

Objetivo do levantamento: medir o que falta para o repositório funcionar como
**biblioteca de backend** — uma base que sobe só com autenticação, sessão e
plataforma, e sobre a qual se instala um módulo específico ou um conjunto
inteiro deles, sem editar código de `shared/`.

Este documento é diagnóstico. Não altera código. Ele complementa
[BOUNDARIES.md](BOUNDARIES.md), que já definiu o roadmap de 4 fases, e mede
quanto de cada fase o objetivo "biblioteca" realmente exige.

> **Status:** a Fase 2 descrita na seção 5 foi implementada em 2026-07-29 —
> manifesto por módulo, loader, seleção por `modules.json`/`MODULES=`.
> Ver [MODULES.md](MODULES.md). Os bloqueadores B1 e B6 estão resolvidos; B2,
> B3, B4, B5 e B7 seguem abertos.

## 1. Critério de aceite

O objetivo está atingido quando estas três coisas forem verdade:

1. **A base sobe sozinha.** Com `src/modules/` contendo apenas `users`,
   `session`, `log`, `notification` (e `loja`, se multi-tenant for padrão), o
   projeto compila, sobe, autentica, emite e revoga sessão, audita e responde
   `/health`. Nenhum arquivo de `shared/` menciona um módulo de negócio.
2. **Instalar um módulo é uma operação declarativa.** Adicionar `caixa` é
   copiar/ligar o módulo e declarar o nome em um manifesto ou variável de
   ambiente — sem tocar em `src/shared/container/index.ts`, em
   `src/shared/infra/https/routes/index.ts`, nem em `routes/domains/*.ts`.
3. **Instalar N módulos de uma vez é a mesma operação.** O loader resolve
   dependências entre módulos, ordena o registro e falha cedo com mensagem clara
   se um módulo pedido depender de outro que não foi instalado.

## 2. Estado atual em números

| Métrica | Valor |
| --- | --- |
| Módulos em `src/modules` | 45 |
| Arquivos `.ts` em `src/modules` | 888 |
| LOC em `src/modules` | 38.157 |
| LOC em `src/shared` | 6.674 |
| LOC em `src/configs` | 731 |
| Contextos declarados em `boundaries.config.json` | 7 |
| Violações de fronteira congeladas no baseline | 46 |
| Violações novas desde a Fase 1 | 0 |

Tamanho da base candidata (contexto `platform`): `users` 2.387 LOC / 63 arquivos,
`session` 1.187 / 14, `loja` 1.179 / 29, `notification` 752 / 16, `log` 397 / 14.
Somados, ~5.900 LOC — 15% do código de módulos.

## 3. O que já joga a favor

- **Contextos declarados e verificados por script.** `boundaries.config.json` +
  `scripts/check-boundaries.ts` mapeiam os 45 módulos em 7 contextos e travam
  regressão (`yarn check:boundaries`, com teste em `tests/unit/check-boundaries.test.js`).
- **Rotas já agrupadas por domínio.** `src/shared/infra/https/routes/domains/*.routes.ts`
  isola o registro de cada domínio em um arquivo — é o ponto natural para o
  loader assumir.
- **Feature flags de infraestrutura prontas.** `src/configs/features.config.ts`
  já liga/desliga Redis, Socket, métricas, email. Falta o mesmo para *contexto de
  negócio*, não para infraestrutura.
- **Gerador de módulo funcional.** `scripts/generate-module.ts` cria a árvore
  completa (dto, model, repositório, services, controller, router, container).
- **Permissões não são centralizadas.** São strings resolvidas em banco
  (`requirePermission('caixas:abrir')`, 4 usos hoje). Nenhum enum global a
  fatiar quando um módulo sai — vantagem grande e não óbvia.
- **Seeds enxutos.** Só `src/configs/seeds/admin.seed.ts`, dependente apenas de
  `users`. Nenhum seed de módulo de negócio a desmontar.

## 4. Bloqueadores

### B1 — Registro estático em dois composition roots (impede desinstalar)

`src/shared/container/index.ts` importa 42 containers de módulo, um por linha.
`src/shared/infra/https/routes/index.ts` mais os 6 arquivos de `routes/domains/`
importam cada router nominalmente. Remover um módulo do disco quebra o
`tsc`; adicionar um exige editar de 2 a 3 arquivos versionados.

Impacto: é o bloqueador principal. Sem resolvê-lo, "instalar um módulo" nunca é
declarativo. É exatamente o escopo da **Fase 2** do roadmap.

### B2 — A base ainda não é autocontida

`shared/` conhece o contexto `platform` por dependência direta:

| Arquivo | Depende de |
| --- | --- |
| `src/shared/middlewares/authMiddleware.ts:11` | model Mongoose `User` (violação `shared-imports-model`) |
| `src/shared/middlewares/authMiddleware.ts:7,8` | porta e service de `session` |
| `src/shared/middlewares/authorizeMiddleware.ts:3` | service de `users` |
| `src/shared/middlewares/requirePermission.ts:3,4` | porta e utils de `users` |
| `src/shared/middlewares/auditMiddleware.ts:3,6` | porta e DTO de `log` |
| `src/configs/seeds/admin.seed.ts` | 5 símbolos de `users` |

Só a primeira linha é violação de regra — as outras são permitidas por
`shared → platform`. Mas todas juntas significam que **`shared/` e `platform`
são um bloco único**: não dá para publicar a base sem os cinco módulos, nem
trocar a implementação de identidade sem editar `shared/`.

Dentro da própria base há uma violação: `src/modules/users/infra/https/routes/authRouter.ts:3`
importa `SessionController` de `session` (`cross-module-controller`). A base
auth+session precisa nascer limpa disso.

### B3 — Tenant (`loja`) está no meio do caminho, sem decisão tomada

`authMiddleware.resolveTenantContext` lê `user.loja` e popula `req.lojaId`.
Todas as rotas de domínio aplicam `setLojaByUserBody`. Cinco módulos importam
`loja` (`cidade`, `colaborador`, `entrada`, `item`, `vendedor`), e `loja` importa
`log`, `parametro` e `pessoa` — ou seja, o tenant puxa um módulo de `cadastros` e
um de `pessoas` para dentro da plataforma.

Falta decidir se multi-tenant é característica da base (e então `parametro` e
`pessoa` sobem para `platform`) ou um módulo opcional atrás de porta.
Enquanto não houver decisão, o recorte da base fica ambíguo.

### B4 — A distribuição do acoplamento é bimodal, e isso é uma boa notícia

Custo de instalação = fecho transitivo de dependências de cada módulo, fora da
base `platform`:

| Custo | Quantos | Módulos |
| --- | --- | --- |
| **0 módulos extras** | 26 | bairro, cargo, centroCusto, cliente, contaCorrente, convenio, deposito, documento, formaPagamento, fornecedor, gerencia, lembrete¹, meioPagamento, motivoTroca, objetoEsquecido, ocorrenciaVeiculos¹, parametro, pesquisaSatisfacao, pessoa, planoPagamento, regraPrecoQuarto, reserva¹, setor, tabelaPreco, tarefaQuarto, unidadeMedida |
| **2 módulos extras** | 2 | cidade, vendedor (ambos → `parametro` + `pessoa`) |
| **19–20 módulos extras** | 12 | caixa, colaborador, comandaHistorico, dashboard, entrada, estadia, inventario, item, relatorio, saida, transferencia, turnoCamareira |

¹ dependem apenas de `notification`, que é base.

Leitura: **28 dos 45 módulos já são instaláveis isoladamente hoje** — o que
falta neles é só o mecanismo (B1). Os outros 12 formam um blocão em torno do
ciclo `caixa ↔ colaborador ↔ entrada ↔ estadia ↔ item ↔ saida`: pedir `inventario`
hoje significa arrastar 19 módulos junto.

Consequência prática: dá para entregar "biblioteca de módulos" para 62% do
catálogo resolvendo só a Fase 2. O blocão de hotelaria/estoque/financeiro é um
único item de catálogo até as fases 3 e 4 quebrarem o ciclo.

### B5 — `notification` é dependência de 9 módulos

`caixa`, `dashboard`, `estadia`, `item`, `lembrete`, `ocorrenciaVeiculos`,
`reserva`, `saida`, `turnoCamareira` chamam
`CreateAndNotifyService` diretamente (19 violações `cross-context-service`
incluem esses casos). Ou `notification` fica na base como está, ou vira porta
publicada/evento na Fase 4. Manter na base é a saída barata e é o que assumo
como padrão neste levantamento.

### B6 — Não existe unidade de instalação descrita

Nenhum módulo declara o que é: nome, contexto, versão, dependências, prefixo de
rota, middlewares exigidos, permissões que introduz, seeds, crons, flags de env.
Hoje isso está espalhado entre `container/index.ts`, `routes/domains/*.ts` e
`boundaries.config.json`. Sem esse metadado, "instalar muitos ao mesmo tempo" não
tem como ser resolvido nem validado — é o insumo do loader da Fase 2.

### B7 — Itens menores de higiene da base

- ~~`package.json` ainda se chama `dgsport-back` com descrição de fábrica de
  uniformes; a base pública precisa de identidade própria.~~ **Resolvido:** a
  identidade do template foi restaurada (`backend-base-ts`) junto com o script
  `init:project`, que um commit anterior havia removido do `package.json`.
- Suíte de testes: 12 arquivos em `tests/unit`, cobrindo scripts e utilitários
  de `shared`. Não há teste de contrato de auth/session — que é justamente o que
  a base promete.
- `yarn build` compila tudo; não há build por seleção de módulos.

## 5. O que precisa ser construído

Fases 2 a 4 já estão acordadas em [BOUNDARIES.md](BOUNDARIES.md). Abaixo, o que
cada uma entrega **em relação a este objetivo**, mais a fase 5 que o objetivo
"biblioteca" acrescenta.

### Fase 2 — `ModuleManifest` + loader (entrega 62% do objetivo)

Cada módulo passa a expor um manifesto no próprio diretório:

```ts
// src/modules/caixa/module.ts
export default defineModule({
  name: 'caixa',
  context: 'financeiro',
  dependsOn: ['estadia', 'saida', 'notification'],
  routes: [{ path: '/caixas', router: caixaRouter, middlewares: [verifyToken, setLojaByUserBody] }],
  register: (container) => { /* o conteúdo do container/index.ts de hoje */ },
});
```

Componentes:

- `defineModule()` e o tipo `IModuleManifest` em `shared/modules/`.
- Loader com descoberta por diretório (`src/modules/*/module.ts`), filtrado por
  `MODULES=` no env ou por `modules.json`; resolve `dependsOn` em ordem
  topológica e falha com erro nomeando o módulo faltante.
- `shared/container/index.ts` e `routes/index.ts` reduzidos a chamar o loader.
- `scripts/check-boundaries.ts` ganha regra: módulo sem manifesto é violação; e
  `dependsOn` precisa bater com os imports reais (o script já extrai o grafo).
- `generate-module.ts` passa a gerar o manifesto em vez de editar composition roots.

Esforço: médio (~3–5 dias). Risco baixo — é mecânico e reversível, e o
`check-boundaries` protege contra regressão.

### Fase 3 — barrel `public/` por contexto

Zera `cross-module-model`, `cross-module-concrete-repository` e
`cross-module-controller` (25 violações). Para o objetivo aqui, o efeito é que um
módulo instalado passa a depender só do contrato publicado do vizinho — condição
para trocar/omitir implementações. Inclui limpar B2 (porta de identidade para o
`authMiddleware`) e a violação interna `authRouter → SessionController`.

Esforço: médio-alto (~5–8 dias), concentrado em `relatorio` (8 violações) e
`estadia`.

### Fase 4 — `DomainEventBus` + flags `CONTEXT_*`

Zera `cross-context-service` (19) e quebra o ciclo de 6 módulos. É o que
transforma o blocão de 19 módulos em itens de catálogo independentes. Enquanto
não acontecer, `estoque`, `financeiro` e `hospedagem` são um pacote só.

Esforço: alto (~2 semanas), com risco de regressão funcional real — mexe em
`CreateService` de estadia, saída e caixa.

### Fase 5 — catálogo e CLI (o que faz virar "biblioteca")

Isto é adicional ao roadmap atual e só faz sentido depois da Fase 2:

- `yarn module:list` — lista o catálogo com contexto, custo de instalação e
  estado (instalado/disponível).
- `yarn module:add caixa estadia saida` — resolve o fecho, avisa o que vem
  junto, liga no `modules.json`.
- `yarn module:remove` — com verificação de dependentes.
- Preset novo em `apply-template-preset.ts`: `base` (só platform).

Esforço: baixo-médio (~2–3 dias) uma vez que o manifesto exista.

## 6. Decisões pendentes

Três decisões mudam materialmente o trabalho e ainda não foram tomadas:

1. **Recorte da base.** Mínima (`users`, `session`, `log`) ou completa
   (`+ notification`, `+ loja`)? A mínima é mais limpa de publicar; a completa
   evita reescrever 9 módulos que chamam `notification` (B5) e resolve o tenant
   por decreto. Recomendo a completa, com `notification` e `loja` marcados como
   base opcional no manifesto.
2. **Multi-tenant é da base?** Se sim, `parametro` e `pessoa` sobem para
   `platform` junto com `loja` (B3). Se não, `loja` vira módulo instalável e
   `authMiddleware` deixa de resolver tenant.
3. **Forma de distribuição.** A decisão de 2026-07-28 foi um deploy único com
   contextos por flag. "Biblioteca" pode significar a mesma coisa (todos os
   módulos no repo, ligados por `modules.json`) ou um catálogo do qual se copia
   código para projetos novos. A Fase 2 é idêntica nos dois casos; a Fase 5
   muda bastante. Recomendo manter repo único com `modules.json` e tratar o
   catálogo como uma capacidade do CLI, não como um segundo repositório.

## 7. Riscos

| Risco | Mitigação |
| --- | --- |
| Loader dinâmico quebra tree-shaking/`tscpaths` no build de produção | Descoberta em tempo de build gerando um índice, não `require` dinâmico em runtime |
| Ordem de registro no tsyringe muda e algo resolve `undefined` | Ordenação topológica por `dependsOn` + teste de boot que resolve todos os tokens |
| `dependsOn` declarado diverge do import real | Regra nova no `check-boundaries`, que já monta o grafo |
| Fase 4 regride regra de negócio de caixa/estadia | Ampliar testes desses serviços antes de mexer; hoje há cobertura parcial em `src/modules/*/services/**/*.test.ts` |

## 8. Resumo executivo

A base auth + session já existe de fato — está em `platform` mais os middlewares
de `shared`, ~5.900 LOC, e funciona. O que não existe é o **mecanismo de
instalação**: os módulos são ligados por import estático em dois arquivos
centrais.

Resolvido só isso (Fase 2, ~1 semana), 28 dos 45 módulos passam a ser
instaláveis isoladamente ou em lote, porque o acoplamento deles já é zero. Os 12
módulos do núcleo de estoque/hospedagem/financeiro continuam sendo um pacote
único até as fases 3 e 4, que são o trabalho pesado e podem esperar sem bloquear
o objetivo.
