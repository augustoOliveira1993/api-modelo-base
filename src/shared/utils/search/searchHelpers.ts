export interface SearchOptions<T = any> {
  /** Campos pesquisados quando o valor for numérico (ex: ['codigo']). */
  numberFields?: (keyof T)[];
  /** Campos pesquisados com regex quando o valor for texto (ex: ['nome', 'descricao']). */
  textFields: (keyof T)[];
}

/**
 * Aplica o parâmetro `search` ao queryParams de forma padronizada
 * - Se `numberFields` for fornecido e o valor for numérico, filtra nesses campos
 * - Caso contrário aplica regex nos `textFields` via $or
 * @param query - Parâmetros da requisição
 * @param queryParams - QueryParams existente
 * @param options - Opções de busca (campos numéricos e textuais)
 * @returns QueryParams com busca aplicada
 */
export function applySearchParam<T = any>(
  query: Record<string, any>,
  queryParams: Record<string, any>,
  options: SearchOptions<T>,
): Record<string, any> {
  if (!query?.search) return queryParams;

  const searchValue = query.search as string;
  const result = { ...queryParams };

  if (options.numberFields?.length) {
    const isNumber = !isNaN(Number(searchValue)) && searchValue !== '';
    if (isNumber) {
      const numVal = Number(searchValue);
      if (options.numberFields.length === 1) {
        result[options.numberFields[0] as string] = numVal;
      } else {
        result.$or = options.numberFields.map(f => ({ [f as string]: numVal }));
      }
      return result;
    }
  }

  const regex = new RegExp(searchValue, 'i');
  result.$or = options.textFields.map(f => ({ [f]: { $regex: regex } }));
  return result;
}
