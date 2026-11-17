import { Document, Model, UpdateWriteOpResult } from 'mongoose';
import { BulkWriteResult } from 'mongodb';
import { IModelPopulated } from '@globalTypes/global';
import {
  buildCursorFilter,
  ICursorPaginationOptions,
} from '@shared/utils/pagination';

export type IQueryParams = Record<string, any>;

type FilterQuery<TDTO> = Partial<TDTO> | Record<string, any>;
type UpdateQuery<TDTO> = Partial<TDTO> | Record<string, any>;

export type IBulkInsertOne<TDTO> = {
  insertOne: { document: TDTO };
};

export type IBulkUpdateOne<TDTO> = {
  updateOne: {
    filter: FilterQuery<TDTO>;
    update: UpdateQuery<TDTO>;
    upsert?: boolean;
  };
};

export type IBulkUpdateMany<TDTO> = {
  updateMany: {
    filter: FilterQuery<TDTO>;
    update: UpdateQuery<TDTO>;
    upsert?: boolean;
  };
};

export type IBulkDeleteOne<TDTO> = {
  deleteOne: { filter: FilterQuery<TDTO> };
};

export type IBulkDeleteMany<TDTO> = {
  deleteMany: { filter: FilterQuery<TDTO> };
};

export type IBulkReplaceOne<TDTO> = {
  replaceOne: {
    filter: FilterQuery<TDTO>;
    replacement: TDTO;
    upsert?: boolean;
  };
};

export type IBulkOperation<TDTO> =
  | IBulkInsertOne<TDTO>
  | IBulkUpdateOne<TDTO>
  | IBulkUpdateMany<TDTO>
  | IBulkDeleteOne<TDTO>
  | IBulkDeleteMany<TDTO>
  | IBulkReplaceOne<TDTO>;

/** `ref` declarado no schema para um path, cobrindo arrays de subdocumento. */
function refDoPath(schema: any, path: string): string | undefined {
  const schemaPath = schema?.path?.(path);
  if (!schemaPath) return undefined;

  return (
    schemaPath.options?.ref ||
    schemaPath.caster?.options?.ref ||
    (Array.isArray(schemaPath.options?.type)
      ? schemaPath.options.type[0]?.ref
      : undefined)
  );
}

/**
 * Remove do populate os paths cujo model referenciado não está registrado.
 *
 * Numa instalação parcial (ver docs/MODULES.md), models de módulos não
 * instalados não existem — ex.: `saida.colaborador` sem o módulo colaborador —
 * e o mongoose falharia com MissingSchemaError. O campo volta como ObjectId
 * puro, que é o dado que existe de fato.
 */
function filtrarPopulatePorModelos(
  populate: IModelPopulated[],
  model: any,
): IModelPopulated[] {
  const connection = model?.db;
  const temModel = (name: string) => Boolean(connection?.models?.[name]);

  const walk = (
    entries: IModelPopulated[],
    schema: any,
  ): IModelPopulated[] => {
    const kept: IModelPopulated[] = [];

    for (const entry of entries) {
      const ref = refDoPath(schema, entry.path);
      if (ref && !temModel(ref)) continue;

      if (!entry.populate?.length) {
        kept.push(entry);
        continue;
      }

      const childSchema = ref ? connection.models[ref]?.schema : undefined;
      const nested = childSchema
        ? walk(entry.populate, childSchema)
        : entry.populate;
      kept.push({
        ...entry,
        ...(nested.length > 0 ? { populate: nested } : { populate: undefined }),
      });
    }

    return kept;
  };

  return walk(populate, model?.schema);
}

export abstract class BaseMongoRepository<TDTO, TDocument extends Document> {
  protected abstract readonly model: Model<TDocument>;
  protected readonly modelPopulated: IModelPopulated[] = [];

  private populateSeguroCache?: IModelPopulated[];

  /**
   * `modelPopulated` filtrado para os models realmente instalados. Todos os
   * `.populate(...)` de repositório devem passar por aqui. Cache seguro: os
   * módulos registram seus models no boot, antes de qualquer query.
   */
  protected populateSeguro(): IModelPopulated[] {
    if (!this.populateSeguroCache) {
      this.populateSeguroCache = filtrarPopulatePorModelos(
        this.modelPopulated,
        this.model,
      );
    }
    return this.populateSeguroCache;
  }

  protected applyQueryOptions(
    mongooseQuery: any,
    options: {
      limit?: number;
      skip?: number;
      sortBy?: string | object;
      sortDesc?: boolean;
    },
  ): void {
    const { limit, skip, sortBy = 'createdAt', sortDesc = true } = options;

    if (sortBy) {
      if (typeof sortBy === 'string') {
        mongooseQuery.sort({ [sortBy]: sortDesc ? -1 : 1 });
      } else {
        mongooseQuery.sort(sortBy);
      }
    }

    if (limit) mongooseQuery.limit(limit);
    if (skip) mongooseQuery.skip(skip);
  }

  protected parseQueryParams(query: IQueryParams = {}): {
    restQuery: IQueryParams;
    options: {
      limit?: number;
      skip?: number;
      sortBy?: string | object;
      sortDesc?: boolean;
    };
    cursorPagination?: ICursorPaginationOptions;
  } {
    const {
      limit,
      skip,
      sortBy,
      sortDesc,
      __cursorPagination,
      ...restQuery
    } = query;

    return {
      restQuery,
      options: { limit, skip, sortBy, sortDesc },
      cursorPagination: __cursorPagination,
    };
  }

  protected applyCursorFilter(
    query: IQueryParams,
    cursorPagination?: ICursorPaginationOptions,
  ): IQueryParams {
    if (!cursorPagination?.cursor) return query;

    const cursorFilter = buildCursorFilter(cursorPagination);

    return {
      $and: [query, cursorFilter],
    };
  }

  async create(data: TDTO): Promise<TDocument> {
    const doc = new this.model(data as any);
    return await doc.save();
  }

  async findAll(query: IQueryParams = {}): Promise<TDocument[]> {
    const { restQuery, options, cursorPagination } =
      this.parseQueryParams(query);
    const filteredQuery = this.applyCursorFilter(restQuery, cursorPagination);
    const mongooseQuery = this.model
      .find(filteredQuery as any)
      .populate(this.populateSeguro());
    this.applyQueryOptions(mongooseQuery, options);
    return (await mongooseQuery.exec()) as unknown as TDocument[];
  }

  async findOne(query: IQueryParams = {}): Promise<TDocument | null> {
    const { restQuery, options, cursorPagination } =
      this.parseQueryParams(query);
    const filteredQuery = this.applyCursorFilter(restQuery, cursorPagination);
    const mongooseQuery = this.model
      .findOne(filteredQuery as any)
      .populate(this.populateSeguro());
    this.applyQueryOptions(mongooseQuery, options);
    return (await mongooseQuery.exec()) as unknown as TDocument | null;
  }

  async findById(id: string): Promise<TDocument | null> {
    return (await this.model
      .findOne({ _id: id } as any)
      .populate(this.populateSeguro())) as unknown as TDocument | null;
  }

  async update(id: string, data: Partial<TDTO>): Promise<TDocument | null> {
    return (await this.model
      .findByIdAndUpdate(id, data as any, { new: true })
      .populate(this.populateSeguro())) as unknown as TDocument | null;
  }

  async delete(id: string): Promise<TDocument | null> {
    return (await this.model.findByIdAndDelete(
      id,
    )) as unknown as TDocument | null;
  }

  async count(query: IQueryParams = {}): Promise<number> {
    const { restQuery, options } = this.parseQueryParams(query);
    if (options.limit) return options.limit;
    return await this.model.countDocuments(restQuery as any);
  }

  async total(query: IQueryParams = {}): Promise<number> {
    const { restQuery } = this.parseQueryParams(query);
    return await this.model.countDocuments(restQuery as any);
  }

  async updateMany(
    query: IQueryParams,
    data: Partial<TDTO> | any,
  ): Promise<UpdateWriteOpResult> {
    return await this.model.updateMany(query, data);
  }

  async insertMany(data: TDTO[]): Promise<TDocument[]> {
    return this.model.insertMany(data as any);
  }

  async deleteMany(query: IQueryParams): Promise<void> {
    await this.model.deleteMany(query);
  }

  async bulkWrite(
    operations: IBulkOperation<TDTO>[],
  ): Promise<BulkWriteResult> {
    return await this.model.bulkWrite(operations as any);
  }

  async bulkUpsert(filter: (keyof TDTO)[], data: TDTO[]): Promise<void> {
    const operations: IBulkUpdateOne<TDTO>[] = data.map(item => ({
      updateOne: {
        filter: filter.reduce(
          (acc, key) => {
            acc[key as string] = (item as any)[key];
            return acc;
          },
          {} as Record<string, any>,
        ),
        update: { $set: item },
        upsert: true,
      },
    }));

    await this.bulkWrite(operations);
  }
}
