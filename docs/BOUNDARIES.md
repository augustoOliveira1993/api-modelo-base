# Fronteiras de Contexto

Este documento descreve a barreira mecânica que protege as fronteiras entre
módulos e contextos de negócio, e como ela se encaixa no plano de evolução da
base para múltiplos verticais.

## Por que existe

`backend-base-ts` hoje carrega 45 módulos em `src/modules`. Para conseguir
adicionar **regras de negócio de outros ramos** sem que cada vertical contamine
os demais, os módulos precisam ser agrupados em contextos delimitados e as
dependências entre eles precisam passar por contratos — não por models Mongoose
nem por implementações concretas.

A regra "não crie dependência circular entre módulos" já existia em
[.codex/skills/backend-base-ts-architecture](../.codex/skills/backend-base-ts-architecture/SKILL.md),
mas nada a aplicava. Este check torna a regra executável.

## Como usar

```bash
yarn check:boundaries
```

Falha (exit 1) somente quando aparece uma violação **nova**, isto é, que não
está em `.boundaries-baseline.json`. As violações já existentes ficam
registradas e visíveis, mas não quebram o build.

```bash
yarn check:boundaries:report
```

Mostra o placar completo, inclusive o que já está no baseline.

Ao **resolver** violações, trave o ganho para que elas não possam voltar:

```bash
yarn check:boundaries --update-baseline
```

O teste `scripts/check-boundaries.test.ts` roda o check contra o código real
em `yarn test`, então uma violação nova quebra a suíte antes de virar merge.

## Contextos

O mapa vive em [boundaries.config.json](../boundaries.config.json). Cada módulo
repete o contexto no próprio manifesto (`src/modules/<nome>/module.ts`), que é
o que substituiu o antigo agrupamento em `routes/domains/` — ver
[MODULES.md](MODULES.md).

| Contexto | Papel |
| --- | --- |
| `platform` | Identidade, sessão, auditoria, notificação e tenant. Acompanha o template e nunca é desligável. |
| `pessoas` | Pessoas físicas/jurídicas e seus papéis. |
| `cadastros` | Tabelas de apoio e parametrização. |
| `estoque` | Itens, entradas, saídas, transferências e inventário. |
| `financeiro` | Caixa, movimentos e saldos. |
| `hospedagem` | Regras de hotelaria: estadias, quartos, reservas, governança. |
| `operacional` | Leitura agregada entre contextos: dashboards e relatórios. |
| `confeccao` | Exemplo de vertical de outro ramo (fábrica de camisetas) — ver [NOVO_VERTICAL.md](NOVO_VERTICAL.md). |

**Ao criar um módulo novo, associe-o a um contexto.** Use
`yarn generate:module -- <nome> --context=<contexto>` para validar o contexto e
registrar o módulo no mapa. Um módulo sem contexto declarado é reportado como
violação `unmapped-module`. Para adicionar um
**vertical** inteiro (contexto novo, de outro ramo de negócio), o passo a
passo com exemplo de ponta a ponta está em
[NOVO_VERTICAL.md](NOVO_VERTICAL.md).

## Regras verificadas

| Regra | O que proíbe | Fase alvo |
| --- | --- | --- |
| `cross-module-model` | Importar model Mongoose de outro módulo | 3 |
| `cross-module-concrete-repository` | Importar implementação concreta de repositório de outro módulo | 3 |
| `cross-module-controller` | Importar controller de outro módulo | 3 |
| `cross-context-service` | Invocar service de outro **contexto** direto, sem evento ou porta | 4 |
| `shared-imports-model` | `shared/` ou `configs/` dependendo de model Mongoose | 3 |
| `shared-imports-non-platform` | `shared/` ou `configs/` dependendo de contexto de negócio | 2 |
| `unmapped-module` | Módulo sem contexto em `boundaries.config.json` | 1 |
| `module-cycle` | Ciclo de dependência entre módulos | 4 |

O que **continua permitido** entre módulos: importar `dto/` e as portas em
`repositories/I*Repository`. Esses são os contratos.

Imports por caminho relativo (`../../outroModulo/...`) são resolvidos antes da
checagem — não dá para escapar da regra trocando o alias por `../`.

### Composition root

Os arquivos listados em `composition.files` podem importar qualquer módulo por
definição, porque é o trabalho deles montar a aplicação:

- `src/shared/container/index.ts`
- `src/shared/infra/https/routes/**`
- `src/configs/seeds/**`

## Placar atual

Baseline criado em 2026-07-28 com **46 violações**:

| Regra | Qtd |
| --- | --- |
| `cross-module-model` | 23 |
| `cross-context-service` | 19 |
| `cross-module-concrete-repository` | 1 |
| `cross-module-controller` | 1 |
| `shared-imports-model` | 1 |
| `module-cycle` | 1 |

O ciclo é um componente fortemente conexo de 3 módulos, todos do contexto
estoque:

```
entrada <-> item <-> saida
```

Em 2026-07-29 o ciclo encolheu de 6 módulos/4 contextos para isso: `saida` e
`caixa` deixaram de importar `estadia`, e `saida` deixou de importar `caixa` e
`colaborador`. As integrações viraram portas em `src/shared/ports`
(`HospedagemPort`, `CaixaPort`, `ColaboradorPort`) com fallback nulo no
`shared/container` e adapter real registrado pelo módulo dono — instalar o
módulo substitui o nulo. Com isso o núcleo de estoque
(`entrada`, `item`, `saida`, `transferencia`, `inventario` + cadastros)
instala sozinho, sem financeiro, pessoas ou hotelaria. As direções inversas
(`caixa → saida`, `colaborador → saida`, `estadia → item/saida/caixa`)
continuam: quem é de fora do estoque ainda exige o estoque. O ciclo interno
restante fica todo num contexto só; dissolvê-lo (e as direções inversas) é a
Fase 4.

## Roadmap

| Fase | Escopo | Efeito no placar |
| --- | --- | --- |
| **1 — concluída** | Barreira mecânica + baseline + testes | Congela em 46; nada novo entra |
| **2 — concluída** | `ModuleManifest` com auto-registro de DI e rotas ([MODULES.md](MODULES.md)) | `shared/container/index.ts` e `routes/index.ts` pararam de crescer; `routes/domains/*` removidos |
| **3** | Barrel `public/` por contexto | Zera `cross-module-model`, `cross-module-concrete-repository`, `cross-module-controller`, `shared-imports-model` |
| **4** | `DomainEventBus` in-process + flags `CONTEXT_*` | Zera `cross-context-service` e `module-cycle` |

Quando o placar chegar a zero, adicionar um vertical novo passa a ser: criar o
contexto, escrever os módulos, ligar a flag — sem tocar em `shared/`.
