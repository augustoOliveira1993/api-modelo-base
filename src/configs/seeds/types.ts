/**
 * Contrato de um seed.
 *
 * Todo seed precisa ser **idempotente**: rodar duas vezes não pode duplicar
 * dados nem falhar. O runner não guarda estado de execução — a checagem de
 * "já existe" é responsabilidade de cada seed.
 */
export interface ISeed {
  /** Identificador usado em `yarn seed --only=<name>`. */
  name: string;
  /** Texto exibido por `yarn seed --list`. */
  description: string;
  run(): Promise<void>;
}
