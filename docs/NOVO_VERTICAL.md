# Adicionando um vertical novo (um "recipiente")

Este guia é o passo a passo para adicionar regras de negócio de **outro ramo**
a este backend — ex.: hoje a base carrega hotelaria, e você quer adicionar uma
fábrica de camisetas esportivas, uma distribuidora, uma clínica. Cada um
desses é um **vertical**: um contexto delimitado novo, com seus próprios
módulos, que se instala do lado dos que já existem sem editar `shared/`.

Existe um exemplo de ponta a ponta já no repositório — contexto `confeccao`,
módulo `ordem-producao` — construído seguindo exatamente estes passos. Os
caminhos abaixo apontam para ele.

Pré-requisito: entenda o vocabulário de [MODULES.md](MODULES.md) (manifesto,
loader, seleção por `modules.json`) e [BOUNDARIES.md](BOUNDARIES.md)
(contextos, regras entre módulos). Este guia assume os dois.

## Passo 0 — separe o que é reaproveitável do que é específico

A maior parte de um vertical novo já existe na base, porque os contextos
genéricos não são específicos de hotel:

| Necessidade | Contexto que já resolve |
| --- | --- |
| Matéria-prima, produto acabado, depósitos, entradas/saídas, inventário | `estoque` |
| Clientes, fornecedores, colaboradores | `pessoas` |
| Tabela de preço, unidade de medida, forma/meio de pagamento | `cadastros` |
| Caixa e movimentos | `financeiro` |
| O que só existe no seu ramo (ordem de produção, prontuário, contrato de aluguel...) | **contexto novo** |

No exemplo da fábrica de camisetas, só a ordem de produção é específica —
matéria-prima e produto acabado são `item` (estoque), cliente é `cliente`
(pessoas). Antes de gerar um módulo, pergunte se ele não é só um `item` com
outro nome.

## Passo 1 — declare o contexto em `boundaries.config.json`

Cada módulo pertence a exatamente um contexto delimitado. Adicione o seu ao
mapa:

```json
"confeccao": {
  "description": "Vertical de exemplo: producao de confeccao (camisetas esportivas)...",
  "modules": ["ordem-producao"]
}
```

Veja o resultado em [boundaries.config.json](../boundaries.config.json). Um
módulo sem contexto aqui é reportado por `yarn check:boundaries` como
`unmapped-module`.

## Passo 2 — gere o módulo

```bash
yarn generate:module -- ordem-producao --context=confeccao
```

Isso cria a árvore inteira em `src/modules/ordem-producao/` (DTO, model,
repository, services de CRUD, controller, router, `container/index.ts` e
`module.ts`) — nenhum arquivo de `shared/` é tocado. O nome do módulo precisa
ser kebab-case (`ordem-producao`, não `ordemProducao`); o gerador recusa outro
formato.

Flags úteis: `--dry-run` (só mostra o plano), `--public` (sem
`verifyToken`/`authorize`), `--cache`, `--soft-delete`. Rode
`yarn generate:module -- --help` para a lista completa.

## Passo 3 — modele o domínio

O gerador cria um recurso genérico (`name`/`description`). Ajuste para os
campos reais:

- [dto/IOrdemProducaoDTO.ts](../src/modules/ordem-producao/dto/IOrdemProducaoDTO.ts)
- [infra/mongo/models/OrdemProducao.ts](../src/modules/ordem-producao/infra/mongo/models/OrdemProducao.ts)
- [infra/https/schemas/OrdemProducaoSchemas.ts](../src/modules/ordem-producao/infra/https/schemas/OrdemProducaoSchemas.ts)

Referências a outro módulo no Mongoose são só `ref: 'Item'` (string) — não
importe o model. É assim que `saida`, `entrada` e `transferencia` já
referenciam `item`.

## Passo 4 — dependências reais entre módulos

O que **é permitido** importar de outro módulo: `dto/` e as interfaces em
`repositories/I*Repository`. É o contrato — não é model Mongoose, não é
controller, não é implementação concreta de repositório.

No exemplo, `CreateService`/`UpdateService` de `ordem-producao` validam o
produto acabado contra o estoque:

```ts
// src/modules/ordem-producao/services/ordemProducao/CreateService.ts
import { IItemRepository } from '@modules/item/repositories/IItemRepository';

@injectable()
export default class CreateService {
  constructor(
    @inject('OrdemProducaoRepository') private repository: IOrdemProducaoRepository,
    @inject('ItemRepository') private itemRepository: IItemRepository,
  ) {}
  // ...valida `data.produto` com this.itemRepository.findById antes de criar
}
```

Isso funciona porque o loader importa o `container/index.ts` de todo módulo
instalado **antes** dos routers — se `item` estiver na seleção, o token
`'ItemRepository'` já está registrado quando `ordem-producao` precisar dele.

Declare a dependência no manifesto:

```ts
// src/modules/ordem-producao/module.ts
export default defineModule({
  name: 'ordem-producao',
  context: 'confeccao',
  dependsOn: ['item'],
  routes: [{ path: '/ordem-producao', router: ordemProducaoRouter }],
});
```

`dependsOn` **não é documentação solta**: `tests/unit/module-manifest.test.js`
compara o array contra os imports reais de `@modules/*` no código do módulo.
Declarar de menos ou de mais quebra o teste — e sem essa declaração, instalar
`ordem-producao` sem `item` falharia em runtime, não no boot.

## Passo 5 — integração com um contexto que pode estar ausente

O passo 4 serve quando o módulo dependido é obrigatório para o seu (sem
`item`, `ordem-producao` não faz sentido). Quando a integração é **opcional**
— o vertical funciona sem o outro contexto instalado, só com menos recurso —
use o padrão de portas em [src/shared/ports](../src/shared/ports):

- a porta (`ICaixaPort`, `IColaboradorPort`, `IHospedagemPort`) declara o
  contrato e não importa nada de `@modules/*`;
- um adapter nulo é registrado em `shared/container/index.ts` **antes** do
  loader (`container.registerInstance(...)`);
- o módulo dono registra o adapter real no próprio `container/index.ts` — como
  o tsyringe usa o último registro do token, instalar o módulo substitui o
  nulo automaticamente.

Exemplo: se uma ordem de produção concluída precisasse lançar consumo no
caixa, isso entraria como uma `ProducaoPort` nova em `shared/ports`, não como
`dependsOn: ['caixa']` — a fábrica continua funcionando sem financeiro
instalado, só sem o lançamento automático.

## Passo 6 — escolha o que sobe

Um `modules.json` (ou `MODULES=` no ambiente) define a seleção. Veja
[modules.confeccao.example.json](../modules.confeccao.example.json) — copie
para `modules.json` na raiz para rodar o backend como fábrica de camisetas:

```bash
cp modules.confeccao.example.json modules.json
yarn dev
```

Se você selecionar um módulo sem uma dependência dele, o boot falha dizendo
exatamente o que falta — não sobe quebrado silenciosamente.

Para um projeto novo já nascendo como fábrica de camisetas, `yarn init:project`
tem o pacote `confeccao` pronto (mesmo fechamento de dependências, resolvido
automaticamente):

```bash
yarn init:project --name camisetas-api --modules confeccao --yes
```

## Passo 7 — valide

```bash
yarn check:boundaries   # nenhuma violação nova de fronteira
yarn typecheck           # tsc --noEmit
yarn test                # inclui module-manifest.test.js (dependsOn vs. imports reais)
yarn build
```

`yarn modules:list` mostra o módulo novo agrupado no contexto declarado, com
as rotas montadas e as dependências.

## As duas regras que não podem ser violadas

1. **Nunca importe model Mongoose nem repositório concreto de outro módulo.**
   Só `dto/` e `repositories/I*Repository`. `yarn check:boundaries` falha o
   build (CI) numa violação nova — mesmo que ainda existam violações antigas
   no baseline de módulos anteriores à Fase 2/3.
2. **Integração com um contexto que pode estar desligado passa por porta**
   (passo 5), nunca por `dependsOn` direto de um módulo de outro contexto que
   é opcional para o seu.

## Onde isso te leva

Com o placar de `check:boundaries` zerado (Fase 3/4 do roadmap em
[BOUNDARIES.md](BOUNDARIES.md)), adicionar um vertical novo vira exatamente os
7 passos acima — nenhum deles toca `src/shared/container/index.ts` nem
`src/shared/infra/https/routes/index.ts`. Já é assim hoje para módulos sem
integração cross-contexto (a maioria); os passos 4 e 5 existem justamente para
os que precisam conversar com um contexto vizinho sem violar a fronteira.
