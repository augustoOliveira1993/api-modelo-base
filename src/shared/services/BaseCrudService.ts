import IBaseMongoRepository from '@shared/infra/database/mongo/IBaseMongoRepository';
import { NotFoundError } from '@shared/errors/AppError';
import { applyLojaFilter } from '@shared/utils/loja';
import { applySearchParam } from '@shared/utils/search';
import {
  applyPaginationParams,
  buildPaginatedResult,
} from '@shared/utils/pagination';

/**
 * Implementa o CRUD simples repetido em ~42 módulos (create/update/delete/
 * findAll/findById com paginação, busca textual e filtro por loja). Módulos
 * com regra de negócio real na criação/atualização sobrescrevem
 * `validateCreate`/`validateUpdate` em vez de reimplementar o resto.
 *
 * Cada módulo continua expondo CreateService/UpdateService/... próprios
 * (resolvidos via tsyringe pelo nome da classe), só que agora como
 * subclasses finas — o controller e o padrão de DI não mudam.
 */
export abstract class BaseCrudService<TDTO, TDocument> {
  protected abstract readonly repository: IBaseMongoRepository<TDTO, TDocument>;

  protected abstract readonly resourceLabel: string;

  protected readonly searchFields: string[] = [];

  protected async validateCreate(_data: TDTO, _lojaId: string): Promise<void> {}

  protected async validateUpdate(
    _id: string,
    _data: Partial<TDTO>,
    _existing: TDocument,
    _lojaId: string,
  ): Promise<void> {}

  public async baseCreate(data: TDTO, lojaId: string) {
    await this.validateCreate(data, lojaId);
    const created = await this.repository.create(data);
    return {
      success: true,
      message: `${this.resourceLabel} criado(a) com sucesso!`,
      data: created,
    };
  }

  public async baseUpdate(id: string, data: Partial<TDTO>, lojaId: string) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError({
        message: `${this.resourceLabel} não encontrado(a)`,
      });
    }
    await this.validateUpdate(id, data, existing, lojaId);
    return this.repository.update(id, data);
  }

  public async baseDelete(id: string) {
    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new NotFoundError({
        message: `${this.resourceLabel} não encontrado(a)`,
      });
    }
    return {
      success: true,
      message: `${this.resourceLabel} deletado(a) com sucesso!`,
      data: deleted,
    };
  }

  public async baseFindById(id: string) {
    const found = await this.repository.findById(id);
    if (!found) {
      throw new NotFoundError({
        message: `${this.resourceLabel} não encontrado(a)`,
      });
    }
    return found;
  }

  public async baseFindAll(query: Record<string, any>) {
    let queryParams: Record<string, any> = {};
    queryParams = applyLojaFilter(query, queryParams);
    if (this.searchFields.length > 0) {
      queryParams = applySearchParam(query, queryParams, {
        textFields: this.searchFields,
      });
    }
    queryParams = applyPaginationParams(query, queryParams);

    const [total, data] = await Promise.all([
      this.repository.total(queryParams),
      this.repository.findAll(queryParams),
    ]);

    return buildPaginatedResult(data, total, query);
  }
}

export default BaseCrudService;
