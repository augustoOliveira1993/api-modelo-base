/**
 * Porta de colaborador (pessoas): o que o estoque (saida) precisa do módulo
 * colaborador sem importar `@modules/colaborador`.
 *
 * Adapter real no módulo `colaborador` (providers/ColaboradorPortAdapter);
 * fallback nulo registrado em `shared/container/index.ts` antes do loader.
 *
 * Este arquivo não pode importar nada de `@modules/*`.
 */

export const COLABORADOR_PORT = 'ColaboradorPort';

export interface IListarIdsColaboradoresFiltro {
  /** Restringe aos ids informados (`_id: { $in: ids }`). */
  ids?: unknown;
  /** Demais campos vão direto para o find (ex.: `ativo`, `loja`). */
  [campo: string]: any;
}

export interface IColaboradorPort {
  /** `false` no adapter nulo. */
  readonly instalado: boolean;

  /**
   * Ids de colaboradores que casam o filtro. `null` quando o módulo não está
   * instalado — o chamador NÃO deve filtrar por colaborador nesse caso
   * (filtrar por lista vazia esconderia tudo).
   */
  listarIds(filtro: IListarIdsColaboradoresFiltro): Promise<string[] | null>;

  /** Anexa itens entregues à ficha do colaborador. */
  registrarItensFicha(colaboradorId: string, itemIds: string[]): Promise<void>;
}

export class NullColaboradorPort implements IColaboradorPort {
  public readonly instalado = false;

  public async listarIds(): Promise<string[] | null> {
    return null;
  }

  public async registrarItensFicha(): Promise<void> {
    // sem colaborador instalado não há ficha para atualizar
  }
}
