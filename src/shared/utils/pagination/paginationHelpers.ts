export interface IPaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  sortBy?: string;
  sortDesc?: boolean;
  skip?: number;
}

export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
}

export interface ICursorPaginationOptions {
  limit: number;
  cursor?: string;
  cursorField: string;
  cursorDirection: 'asc' | 'desc';
}

export interface ICursorPaginationResult<T> {
  data: T[];
  limit: number;
  hasNext: boolean;
  nextCursor: string | null;
}

interface ICursorPayload {
  fieldValue: string | number | Date;
  id: string;
}

const DEFAULT_CURSOR_LIMIT = 25;
const MAX_CURSOR_LIMIT = 100;

/**
 * Aplica os parâmetros de paginação e ordenação ao queryParams
 * O cliente envia: page (1-based), limit, sortBy, sortDesc
 * O skip é calculado internamente: skip = (page - 1) * limit
 * @param query - Parâmetros da requisição
 * @param queryParams - QueryParams existente (opcional)
 * @returns QueryParams com paginação aplicada
 */
export function applyPaginationParams(
  query: Record<string, any>,
  queryParams: Record<string, any> = {},
): Record<string, any> {
  const result = { ...queryParams };
  const limit = Number(query?.limit) || 0;
  const page = Number(query?.page) || 1;
  if (limit) result.limit = limit;
  result.skip = limit > 0 ? (page - 1) * limit : 0;
  if (query?.sortBy) result.sortBy = query.sortBy;
  if (query?.sortDesc) result.sortDesc = query.sortDesc;
  return result;
}

/**
 * Monta o objeto de resposta paginado padronizado
 * @param data - Registros retornados pela query
 * @param total - Total de registros sem paginação (via count)
 * @param query - Query original da requisição (contém page e limit)
 * @returns Objeto com dados paginados e metadados
 */
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  query: Record<string, any>,
): IPaginatedResult<T> {
  const limit = Number(query?.limit) || 0;
  const page = Number(query?.page) || 1;
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
  const hasNext = page < totalPages;
  return { hasNext, total, limit, currentPage: page, totalPages, data };
}

function clampLimit(limit: number): number {
  if (!limit || limit < 1) return DEFAULT_CURSOR_LIMIT;
  return Math.min(limit, MAX_CURSOR_LIMIT);
}

export function encodeCursor(payload: ICursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(cursor: string): ICursorPayload {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
}

export function applyCursorPaginationParams(
  query: Record<string, any>,
  queryParams: Record<string, any> = {},
): Record<string, any> {
  const limit = clampLimit(Number(query?.limit));
  const cursorField = query?.cursorField || 'createdAt';
  const cursorDirection = query?.cursorDirection === 'asc' ? 'asc' : 'desc';
  const sortDirection = cursorDirection === 'asc' ? 1 : -1;

  return {
    ...queryParams,
    limit: limit + 1,
    sortBy: { [cursorField]: sortDirection, _id: sortDirection },
    __cursorPagination: {
      limit,
      cursor: query?.cursor,
      cursorField,
      cursorDirection,
    } as ICursorPaginationOptions,
  };
}

export function buildCursorFilter(
  cursorPagination: ICursorPaginationOptions,
): Record<string, any> {
  if (!cursorPagination.cursor) return {};

  const { cursorField, cursorDirection } = cursorPagination;
  const cursor = decodeCursor(cursorPagination.cursor);
  const operator = cursorDirection === 'asc' ? '$gt' : '$lt';

  if (cursorField === '_id') {
    return { _id: { [operator]: cursor.id } };
  }

  return {
    $or: [
      { [cursorField]: { [operator]: cursor.fieldValue } },
      {
        [cursorField]: cursor.fieldValue,
        _id: { [operator]: cursor.id },
      },
    ],
  };
}

function getCursorFieldValue<T>(item: T, cursorField: string): unknown {
  const source = item as Record<string, any>;
  const value = source[cursorField] ?? source._id ?? source.id;

  if (value instanceof Date) return value.toISOString();
  return value;
}

function getDocumentId<T>(item: T): string {
  const source = item as Record<string, any>;
  return String(source._id || source.id);
}

export function buildCursorPaginatedResult<T>(
  data: T[],
  query: Record<string, any>,
): ICursorPaginationResult<T> {
  const limit = clampLimit(Number(query?.limit));
  const cursorField = query?.cursorField || 'createdAt';
  const visibleData = data.slice(0, limit);
  const hasNext = data.length > limit;
  const lastItem = visibleData[visibleData.length - 1];

  return {
    data: visibleData,
    limit,
    hasNext,
    nextCursor:
      hasNext && lastItem
        ? encodeCursor({
            fieldValue: getCursorFieldValue(lastItem, cursorField) as
              | string
              | number
              | Date,
            id: getDocumentId(lastItem),
          })
        : null,
  };
}
