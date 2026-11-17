# Receita: leitura e geração de planilhas Excel

O `xlsx` (SheetJS) foi **removido do template** por dois motivos:

1. **Nenhum módulo o usava.** As funções existiam em `shared/utils/excel/` e em
   `healpers.ts`, mas nada no `src/` as chamava.
2. **As versões publicadas no npm têm 2 vulnerabilidades High sem correção
   disponível lá** — Prototype Pollution (CVE-2023-30533) e ReDoS
   (CVE-2024-22363). O npm está congelado em `0.18.5`; a SheetJS passou a
   publicar **apenas no CDN próprio** a partir da `0.19.3`.

Instalar `xlsx` do npm hoje significa importar essas duas falhas.

## Como reativar (versão corrigida, via CDN da SheetJS)

```bash
yarn add https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

Isso instala a versão corrigida. Repare que:

- o `yarn.lock` passa a apontar para uma URL fora do registro npm — ambientes
  de CI com registro restrito ou sem saída para a internet vão falhar no
  install;
- o Dependabot não acompanha pacotes instalados por URL, então atualizações
  passam a ser responsabilidade sua;
- para fixar uma versão nova, troque a URL (não há `^` nem `~` aqui).

## Restaurar o código

Os arquivos originais estão ao lado deste README:

```bash
mkdir -p src/shared/utils/excel
cp docs/recipes/excelService.ts.txt   src/shared/utils/excel/excelService.ts
cp docs/recipes/excelFormatters.ts.txt src/shared/utils/excel/excelFormatters.ts
cp docs/recipes/index.ts.txt           src/shared/utils/excel/index.ts
```

E re-exporte no barrel, se quiser:

```ts
// src/shared/utils/index.ts
export {
  readExcelSheetToJson,
  jsonToExcel,
  convertExcelDate,
  sanitizeExcelValue,
  invalidDataProcessingExecel,
} from './excel';
```

Duas funções que ficavam em `healpers.ts` também usavam XLSX e foram removidas
de lá: `readExcelSheetToJson` e `jsonToExcel`. As versões equivalentes estão no
`excelService.ts.txt`.

## Alternativas sem o problema de distribuição

Se o objetivo for só **gerar** planilhas, estas são mantidas no npm e não têm as
CVEs acima:

| Pacote | Para quê |
|---|---|
| `exceljs` | Ler e escrever `.xlsx` com formatação, fórmulas e streaming |
| `write-excel-file` | Escrita simples, API enxuta |
| `csv-stringify` / `papaparse` | Quando CSV resolve — bem mais leve |

Para **relatórios** que hoje viram planilha, avalie também devolver JSON e deixar
a formatação com o frontend.
