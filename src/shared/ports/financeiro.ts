/**
 * Porta de financeiro (caixa): o que o estoque (saida) precisa do caixa sem
 * importar `@modules/caixa`.
 *
 * Adapter real no módulo `caixa` (providers/CaixaPortAdapter); fallback nulo
 * registrado em `shared/container/index.ts` antes do loader. Sem o módulo
 * instalado, as saídas não validam nem lançam movimento de caixa — o estoque
 * funciona sozinho.
 *
 * Este arquivo não pode importar nada de `@modules/*`.
 */

export const CAIXA_PORT = 'CaixaPort';

export interface IValidarCaixaAbertoInput {
  lojaId: string;
  operadorEmail?: string;
  usuario?: string;
  referencia: string;
}

export interface IRegistrarMovimentoCaixaInput
  extends IValidarCaixaAbertoInput {
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
  historico: string;
  nro_docto?: string;
  inicio_saldo?: string;
  contabiliza_caixa?: boolean;
  exibir_relatorio?: boolean;
  meio_pgto?: Array<Record<string, any>>;
  local_pagamento?: string;
}

export interface ICaixaPort {
  /** `false` no adapter nulo. */
  readonly instalado: boolean;

  /** Garante caixa aberto para o operador; lança BadRequest quando não há. */
  validarCaixaAberto(input: IValidarCaixaAbertoInput): Promise<void>;

  /** Lança um movimento (entrada/saída) no caixa aberto do operador. */
  registrarMovimento(input: IRegistrarMovimentoCaixaInput): Promise<void>;
}

/** Sem o módulo caixa: nada a validar, nada a lançar. */
export class NullCaixaPort implements ICaixaPort {
  public readonly instalado = false;

  public async validarCaixaAberto(): Promise<void> {
    // sem caixa instalado não existe caixa para validar
  }

  public async registrarMovimento(): Promise<void> {
    // sem caixa instalado não há movimento financeiro
  }
}
