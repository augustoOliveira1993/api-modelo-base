import { BadRequestError } from '@shared/errors/AppError';

/**
 * Porta de hospedagem: o que estoque (saida) e financeiro (caixa) precisam
 * da hotelaria sem importar `@modules/estadia` diretamente.
 *
 * O adapter real vive no módulo `estadia` (providers/EstadiaHospedagemPort) e
 * é registrado no container daquele módulo. Sem o módulo instalado, vale o
 * `NullHospedagemPort` registrado em `shared/container/index.ts` antes do
 * loader — o último registro no tsyringe vence, então instalar `estadia`
 * substitui o nulo automaticamente.
 *
 * Este arquivo não pode importar nada de `@modules/*`: ele precisa compilar
 * em instalações onde a hotelaria (ou o estoque) foi removida.
 */

export const HOSPEDAGEM_PORT = 'HospedagemPort';

/** Valores de `meio_entrada` da estadia (iguais aos do model da hotelaria). */
export const MEIO_ENTRADA = {
  CARRO: 'CARRO',
  MOTO: 'MOTO',
  PE: 'PE',
} as const;

export interface IEstadiaParaConsumo {
  id: string;
  /** Id do quarto da estadia, já normalizado para string. */
  quarto?: string;
  cliente_nome?: string;
  placa_veiculo?: string;
}

export interface IEstadiaConsumoEntry {
  item?: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface IComandaHistoricoSaidaEntry {
  loja: string;
  /** Referência da comanda (id da saída, mantido no campo `estadia`). */
  estadia: string;
  justificativa?: string;
  usuario?: string;
  usuario_email?: string;
  campos_alterados: Array<{
    campo: string;
    valor_anterior?: unknown;
    valor_novo?: unknown;
  }>;
  created_by?: string;
}

/** Forma solta de propósito: os relatórios do caixa leem campos populados. */
export interface IEstadiaResumoCaixa {
  codigo?: string;
  quarto?: unknown;
  periodo_selecionado?: { preco?: number } | null;
  consumos?: Array<Record<string, any>>;
  data_entrada?: Date | string;
  data_saida?: Date | string;
  meio_entrada?: string;
  [campo: string]: any;
}

export interface IQuartosStatusResumo {
  disponivel: number;
  ocupado: number;
  manutencao: number;
  limpeza: number;
}

export interface IHospedagemPort {
  /** `false` no adapter nulo — permite degradar mensagens e fluxos. */
  readonly instalado: boolean;

  /** Estadia da loja para lançar consumo; `null` quando não existe. */
  buscarEstadiaParaConsumo(
    estadiaId: string,
    lojaId: string,
  ): Promise<IEstadiaParaConsumo | null>;

  /** Acrescenta consumos na estadia (comanda). */
  registrarConsumos(
    estadiaId: string,
    consumos: IEstadiaConsumoEntry[],
  ): Promise<void>;

  /** `true` se o quarto está aguardando a conferência da camareira. */
  quartoAguardandoConferencia(quartoId: string): Promise<boolean>;

  /** Auditoria de alteração de comanda (histórico da hotelaria). */
  registrarComandaHistoricoSaida(
    entry: IComandaHistoricoSaidaEntry,
  ): Promise<void>;

  /** Estadias da loja cujos códigos batem com as referências de movimento. */
  buscarEstadiasPorCodigos(
    lojaId: string,
    codigos: string[],
  ): Promise<IEstadiaResumoCaixa[]>;

  /** Contagem de quartos por status para a capa do caixa. */
  resumoStatusQuartos(): Promise<IQuartosStatusResumo>;
}

/**
 * Implementação usada quando o módulo `estadia` não está instalado: fluxos
 * que dependem de hospedagem falham com mensagem clara, e os de leitura
 * degradam para vazio.
 */
export class NullHospedagemPort implements IHospedagemPort {
  public readonly instalado = false;

  public async buscarEstadiaParaConsumo(): Promise<IEstadiaParaConsumo | null> {
    throw new BadRequestError({
      message:
        'Saída de consumo em estadia requer o módulo de hospedagem (estadia), que não está instalado.',
    });
  }

  public async registrarConsumos(): Promise<void> {
    // sem hospedagem não há comanda para atualizar
  }

  public async quartoAguardandoConferencia(): Promise<boolean> {
    return false;
  }

  public async registrarComandaHistoricoSaida(): Promise<void> {
    // sem hospedagem não há histórico de comanda
  }

  public async buscarEstadiasPorCodigos(): Promise<IEstadiaResumoCaixa[]> {
    return [];
  }

  public async resumoStatusQuartos(): Promise<IQuartosStatusResumo> {
    return { disponivel: 0, ocupado: 0, manutencao: 0, limpeza: 0 };
  }
}
