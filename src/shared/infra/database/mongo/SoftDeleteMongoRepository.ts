import { Document } from 'mongoose';
import { BaseMongoRepository, IQueryParams } from './BaseMongoRepository';
import moment from 'moment-timezone';

export abstract class SoftDeleteMongoRepository<
  TDTO,
  TDocument extends Document,
> extends BaseMongoRepository<TDTO, TDocument> {
  async findAll(query: IQueryParams = {}): Promise<TDocument[]> {
    const { restQuery, options, cursorPagination } =
      this.parseQueryParams(query);
    const filteredQuery = this.applyCursorFilter(
      { ...restQuery, deletedAt: null },
      cursorPagination,
    );
    const mongooseQuery = this.model
      .find(filteredQuery as any)
      .populate(this.populateSeguro());
    this.applyQueryOptions(mongooseQuery, options);
    return (await mongooseQuery.exec()) as unknown as TDocument[];
  }

  async findOne(query: IQueryParams = {}): Promise<TDocument | null> {
    const { restQuery, options, cursorPagination } =
      this.parseQueryParams(query);
    const filteredQuery = this.applyCursorFilter(
      { ...restQuery, deletedAt: null },
      cursorPagination,
    );
    const mongooseQuery = this.model
      .findOne(filteredQuery as any)
      .populate(this.populateSeguro());
    this.applyQueryOptions(mongooseQuery, options);
    return (await mongooseQuery.exec()) as unknown as TDocument | null;
  }

  async findById(id: string): Promise<TDocument | null> {
    return (await this.model
      .findOne({ _id: id, deletedAt: null } as any)
      .populate(this.populateSeguro())) as unknown as TDocument | null;
  }

  async count(query: IQueryParams = {}): Promise<number> {
    const { restQuery, options } = this.parseQueryParams(query);
    if (options.limit) return options.limit;
    return await this.model.countDocuments({
      ...restQuery,
      deletedAt: null,
    } as any);
  }

  async total(query: IQueryParams = {}): Promise<number> {
    const { restQuery } = this.parseQueryParams(query);
    return await this.model.countDocuments({
      ...restQuery,
      deletedAt: null,
    } as any);
  }

  async findAllDeleted(query: IQueryParams = {}): Promise<TDocument[]> {
    const { restQuery, options, cursorPagination } =
      this.parseQueryParams(query);
    const filteredQuery = this.applyCursorFilter(
      { ...restQuery, deletedAt: { $ne: null } },
      cursorPagination,
    );
    const mongooseQuery = this.model
      .find(filteredQuery as any)
      .populate(this.populateSeguro());
    this.applyQueryOptions(mongooseQuery, options);
    return (await mongooseQuery.exec()) as unknown as TDocument[];
  }

  async totalDeleted(query: IQueryParams = {}): Promise<number> {
    const { restQuery } = this.parseQueryParams(query);
    return await this.model.countDocuments({
      ...restQuery,
      deletedAt: { $ne: null },
    } as any);
  }

  async softDelete(
    id: string,
    data?: Partial<TDTO>,
  ): Promise<TDocument | null> {
    return (await this.model
      .findByIdAndUpdate(id, { deletedAt: moment().toDate(), ...data } as any, {
        new: true,
      })
      .populate(this.populateSeguro())) as unknown as TDocument | null;
  }

  async restore(id: string, data?: Partial<TDTO>): Promise<TDocument | null> {
    return (await this.model
      .findByIdAndUpdate(id, { deletedAt: null, ...data } as any, { new: true })
      .populate(this.populateSeguro())) as unknown as TDocument | null;
  }

  async findByIdDeleted(id: string): Promise<TDocument | null> {
    return (await this.model
      .findOne({ _id: id, deletedAt: { $ne: null } } as any)
      .populate(this.populateSeguro())) as unknown as TDocument | null;
  }
}
