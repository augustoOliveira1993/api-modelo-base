/**
 * Interface para definir as opções de erro utilizadas nas classes de erro da aplicação.
 *
 * @interface IOptionsAppError
 * @property {string} [title] - Título descritivo do erro.
 * @property {number} [status_code] - Código HTTP do erro.
 * @property {string} [message] - Mensagem detalhada do erro.
 */
export interface IOptionsAppError {
  title?: string;
  status_code?: number;
  message?: string;
}

/**
 * Marca de identidade do AppError.
 *
 * `Symbol.for` usa o registro global de símbolos: duas cópias distintas deste
 * módulo (ex.: duas versões do pacote no mesmo `node_modules`) produzem o
 * MESMO símbolo. É o que permite `isAppError()` funcionar através de fronteiras
 * de pacote, onde `instanceof` falharia silenciosamente e o errorMiddleware
 * passaria a responder 500 em todo erro de negócio.
 */
const APP_ERROR_BRAND = Symbol.for('backendkit.AppError');

/**
 * Classe base para representar erros personalizados na aplicação.
 *
 * Estende `Error` para que o erro tenha stack trace, seja reconhecido por
 * `express-async-errors` e sobreviva a `catch (e) { e instanceof Error }`.
 *
 * @class AppError
 */
export class AppError extends Error {
  static readonly [APP_ERROR_BRAND] = true;

  public readonly optionsError: IOptionsAppError;

  constructor(optionsError: IOptionsAppError) {
    super(optionsError.message ?? 'Erro interno no servidor.');

    this.name = new.target.name;
    this.optionsError = {
      title: 'Ocorreu um erro interno!',
      status_code: 500,
      message: 'Erro interno no servidor.',
      ...optionsError,
    };

    Error.captureStackTrace?.(this, new.target);
  }

  getMessage(): IOptionsAppError {
    return this.optionsError;
  }

  get statusCode() {
    return this.optionsError.status_code;
  }
}

/**
 * Type guard para AppError. **Use isto no lugar de `instanceof AppError`.**
 *
 * Checa a marca no construtor (herdada por todas as subclasses via cadeia de
 * protótipos estática), e não a identidade da classe — por isso continua
 * verdadeiro mesmo quando o erro foi criado por outra cópia deste módulo.
 */
export function isAppError(error: unknown): error is AppError {
  return (
    !!error &&
    typeof error === 'object' &&
    (error as { constructor?: Record<symbol, unknown> }).constructor?.[
      APP_ERROR_BRAND
    ] === true
  );
}

/**
 * Representa um erro de requisição inválida (HTTP 400).
 *
 * @class BadRequestError
 * @extends AppError
 */
export class BadRequestError extends AppError {
  constructor({ message, title, status_code = 400 }: IOptionsAppError) {
    super({ message, status_code, title: title || 'Requisição inválida!' });
  }
}

/**
 * Representa um erro de autenticação (HTTP 401).
 *
 * @class UnauthorizedError
 * @extends AppError
 */
export class UnauthorizedError extends AppError {
  constructor({ message, title, status_code = 401 }: IOptionsAppError) {
    super({ message, status_code, title: title || 'Não autorizado!' });
  }
}

/**
 * Representa um erro de permissão (HTTP 403).
 *
 * @class ForbiddenError
 * @extends AppError
 */
export class ForbiddenError extends AppError {
  constructor({ message, title, status_code = 403 }: IOptionsAppError) {
    super({ message, status_code, title: title || 'Proibido!' });
  }
}

/**
 * Representa um erro de recurso não encontrado (HTTP 404).
 *
 * @class NotFoundError
 * @extends AppError
 */
export class NotFoundError extends AppError {
  constructor({ message, title, status_code = 404 }: IOptionsAppError) {
    super({ message, status_code, title: title || 'Não encontrado!' });
  }
}

/**
 * Representa um erro de conflito de dados (HTTP 409).
 *
 * @class ConflictError
 * @extends AppError
 */
export class ConflictError extends AppError {
  constructor({ message, title, status_code = 409 }: IOptionsAppError) {
    super({ message, status_code, title: title || 'Conflito de dados!' });
  }
}

/**
 * Opções do BusinessRuleError — exige um `code` estável.
 *
 * @interface IOptionsBusinessRuleError
 */
export interface IOptionsBusinessRuleError extends IOptionsAppError {
  code: string;
}

/**
 * Representa a violação de uma regra de negócio (HTTP 422 por padrão),
 * ex.: estoque insuficiente, recurso já reservado, caixa já aberto.
 *
 * Diferente de `BadRequestError` (dados malformados/sintaxe inválida), este
 * erro indica que a requisição é sintaticamente válida mas viola uma
 * invariante de domínio. O `code` é estável e pensado para ser consumido por
 * código (frontend, métricas), enquanto `message`/`title` são para exibição.
 *
 * @class BusinessRuleError
 * @extends AppError
 */
export class BusinessRuleError extends AppError {
  public readonly code: string;

  constructor({
    message,
    title,
    status_code = 422,
    code,
  }: IOptionsBusinessRuleError) {
    super({
      message,
      status_code,
      title: title || 'Regra de negócio violada!',
    });
    this.code = code;
  }

  getMessage() {
    return { ...this.optionsError, code: this.code };
  }
}

/**
 * Representa um erro interno do servidor (HTTP 500).
 *
 * @class InternalServerError
 * @extends AppError
 */
export class InternalServerError extends AppError {
  /**
   * @param {IOptionsAppError} optionsError - Detalhes do erro.
   */
  constructor({ message, title, status_code = 500 }: IOptionsAppError) {
    super({
      message,
      status_code,
      title: title || 'Erro interno do servidor!',
    });
  }
}
