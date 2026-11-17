# Módulos: instalar, remover e criar

Cada diretório em `src/modules` é uma unidade instalável. Ele se declara em
`module.ts` e o loader (`src/shared/modules`) faz o resto: registra o DI, monta
as rotas e valida dependências no boot.

Nenhum arquivo de `shared/` precisa ser editado para adicionar ou remover um
módulo. Antes da Fase 2 isso exigia mexer em `shared/container/index.ts` e em
`routes/index.ts` + `routes/domains/*.routes.ts` — esses arquivos de domínio
deixaram de existir, e o agrupamento por domínio virou o campo `context` do
manifesto.

## Selecionar o que sobe

Em ordem de precedência:

1. Variável de ambiente `MODULES` — lista separada por vírgula, ou `*`.
2. `modules.json` na raiz — `{ "modules": ["users", "session"] }` ou `"*"`.
3. Nada declarado: **todos** os módulos presentes em `src/modules`.

O padrão é "todos" de propósito: quem não configura nada continua com o
comportamento de sempre. Há um exemplo pronto em `modules.example.json`.

```bash
MODULES=users,session,log yarn dev
```

```bash
yarn modules:list
```

`modules:list` mostra o que está instalado, em que contexto, sob quais rotas e
o que está disponível mas fora da seleção. Aceita `--json`.

## A base

`users`, `session`, `log` e `notification` (mais `loja`, se o produto for
multi-tenant) são o núcleo: autenticação, sessão, auditoria e notificação. Os
middlewares de `shared/` dependem deles, então na prática a base é o piso de
qualquer instalação. O loader não impõe isso — se você listar só `bairro`, ele
sobe só `bairro` — mas as rotas protegidas por `verifyToken` precisam de `users`
e `session` para funcionar.

## Custo de instalação

Nem todo módulo é independente. Medido em 2026-07-29 (ver
[LEVANTAMENTO_BASE_MODULAR.md](LEVANTAMENTO_BASE_MODULAR.md)):

| Custo | Quantos | Exemplos |
| --- | --- | --- |
| Instala sozinho | 26 | bairro, cargo, cliente, deposito, fornecedor, pessoa, reserva, tarefaQuarto |
| Puxa 2 módulos | 2 | cidade, vendedor (ambos → `parametro` + `pessoa`) |
| Núcleo de estoque (16 com a base) | — | `saida` puxa item, deposito, entrada e cadastros — sem caixa, colaborador ou hotelaria |

O núcleo de estoque (`entrada ↔ item ↔ saida` + `transferencia`, `inventario`)
**instala sozinho**: as integrações com financeiro, pessoas e hotelaria viraram
portas em `src/shared/ports` — `CaixaPort`, `ColaboradorPort` e
`HospedagemPort`. Cada porta tem um fallback nulo registrado no
`shared/container` antes do loader; instalar o módulo dono (`caixa`,
`colaborador`, `estadia`) registra o adapter real por cima. Sem eles: movimentos
de caixa não são lançados, filtros de ficha degradam, consumo em estadia
responde erro claro. O populate dos repositórios também degrada sozinho — paths
cujo model não está registrado são ignorados e o campo volta como ObjectId.
As direções inversas (`caixa → saida`, `colaborador → saida`,
`estadia → item/saida/caixa`) continuam: financeiro/pessoas/hotelaria exigem o
estoque — Fase 4 do [roadmap de fronteiras](BOUNDARIES.md).

```bash
# núcleo de estoque, zero financeiro/hotelaria — o loader valida no boot
MODULES=users,session,log,notification,loja,parametro,pessoa,deposito,fornecedor,tabelaPreco,unidadeMedida,entrada,item,saida,transferencia,inventario yarn dev
```

Se você selecionar um módulo sem as dependências dele, o boot falha dizendo
exatamente o que falta:

```
[modules] Módulos instalados dependem de módulos que não foram instalados:
  - "inventario" depende de: item
```

## Anatomia do manifesto

```ts
// src/modules/bairro/module.ts
import { defineModule } from '@shared/modules/defineModule';
import { verifyToken } from '@shared/middlewares/authMiddleware';
import { setLojaByUserBody } from '@shared/middlewares/lojaMiddleware';
import bairroRouter from '@modules/bairro/infra/https/routes/bairroRouter';

export default defineModule({
  name: 'bairro',
  context: 'cadastros',
  routes: [
    {
      path: '/bairros',
      middlewares: [verifyToken, setLojaByUserBody],
      router: bairroRouter,
    },
  ],
});
```

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| `name` | sim | Igual ao nome do diretório; o loader recusa divergência |
| `context` | sim | Mesmo contexto declarado em `boundaries.config.json` |
| `description` | não | Aparece em `modules:list` |
| `dependsOn` | não | Outros módulos que este importa |
| `routes` | não | Módulo sem rota pública (ex.: `session`) omite |

**DI não se declara no manifesto.** O loader importa
`src/modules/<nome>/container/index.ts` por convenção, antes de qualquer router
— preservando a ordem que `shared/container/index.ts` garantia: primeiro todo o
registro, depois as rotas.

`dependsOn` é verificado por teste contra os imports reais do módulo
(`src/shared/modules/ModuleRegistry.test.ts`), então não adianta declarar de
menos nem de mais.

## Criar um módulo

```bash
yarn generate:module -- estoque-minimo --context=cadastros
```

Gera a árvore completa já com `module.ts`. Depois:

1. Ajuste DTO e schema Mongoose.
2. Confirme o contexto que o gerador registrou em `boundaries.config.json`.
3. `yarn check:boundaries && yarn build`.

Com `--context=`, o gerador valida o contexto e registra o módulo uma única vez
em `boundaries.config.json`. Se a opção for omitida, o manifesto sai com
`TODO-defina-o-contexto` e exige correção antes do boot.

O módulo inclui `permissions/ACL.ts`, um controller com
`@RequiredPermission(ACL.recurso.acao)`, rotas via `defineRoutes` e um teste
`Controller.test.ts` ao lado do controller. Rotas protegidas usam arrays para
autenticação e middlewares; `--public` gera `auth: false` explícito.

### Criar um submódulo

```bash
yarn generate:sub-module -- estoque-minimo regra-preco --dry-run
yarn generate:sub-module -- estoque-minimo regra-preco
```

O submódulo fica em `src/modules/estoque-minimo/submodules/regra-preco/` e
compartilha o contexto, o container DI e o catálogo ACL do pai. O manifesto do
pai passa a montar o router em `/api/estoque-minimo/regra-preco`. O gerador
valida a rota e as chaves duplicadas antes de gravar; não edita os agregadores
globais de `shared/`.

Para adicionar um **contexto novo** (um ramo de negócio inteiro, não só mais
um módulo de um contexto existente), o passo a passo completo — com exemplo
de ponta a ponta — está em [NOVO_VERTICAL.md](NOVO_VERTICAL.md).

## Ordem de carga

1. Descobre os diretórios de `src/modules` (ou `dist/modules` em produção).
2. Resolve a seleção (`MODULES` → `modules.json` → todos).
3. Importa o `container/index.ts` de cada selecionado (registro de DI).
4. Importa os manifestos (que trazem os routers junto).
5. Valida `dependsOn` contra o que foi instalado.
6. Ordena dependências primeiro — tolerando o ciclo conhecido — e monta as rotas.

A ordem de montagem não altera roteamento: todos os prefixos são literais e
distintos, e há teste garantindo que nenhum é montado duas vezes.

## Limitações conhecidas

- **`shared/` ainda depende do contexto `platform`.** `authMiddleware`,
  `authorizeMiddleware`, `requirePermission` e `auditMiddleware` importam
  `users`, `session` e `log` diretamente — um deles importa até o model
  Mongoose. Desacoplar isso é a Fase 3.
- **`session` não tem rotas próprias.** Os endpoints estão no `authRouter` de
  `users` (`/auth/sessions`, `/auth/logout`). O `sessionRouter` existe no módulo
  mas nunca foi montado.
- **`/api/notifications` não passa por `verifyToken`.** É assim desde antes da
  Fase 2: o mount sem middleware vinha primeiro em `routes/index.ts` e o mount
  protegido, em `operacional.routes.ts`, era inalcançável. A Fase 2 preservou o
  comportamento e removeu o mount morto — a correção é uma decisão à parte.
