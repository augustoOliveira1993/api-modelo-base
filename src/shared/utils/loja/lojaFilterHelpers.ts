export function buildLojaFilter(
  query: Record<string, any> = {},
  field = 'loja',
): Record<string, any> {
  if (query.loja) {
    return { [field]: query.loja };
  }

  if (query.lojas) {
    return { [field]: { $in: query.lojas } };
  }

  return {};
}

export function applyLojaFilter(
  query: Record<string, any> = {},
  queryParams: Record<string, any> = {},
  field = 'loja',
): Record<string, any> {
  return {
    ...queryParams,
    ...buildLojaFilter(query, field),
  };
}
