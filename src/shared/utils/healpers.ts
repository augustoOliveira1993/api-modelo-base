import { isValidObjectId } from 'mongoose';
import moment from 'moment-timezone';

export function isValidObjectIdMongose(id: string): boolean {
  return isValidObjectId(id);
}

export function convertExecelDate(execelDate: any): string {
  const regex = /^[0-9]+$/;
  if (!regex.test(execelDate)) {
    return ['#N/D', undefined, 'undefined', '***'].indexOf(execelDate) === -1
      ? 'Data Invalida'
      : execelDate;
  }

  const serial = parseInt(execelDate, 10);

  const utc_days = serial - 25568;
  const date = new Date(utc_days * 86400 * 1000);

  const formattedDate = moment(date).format('DD/MM/YYYY');
  return formattedDate;
}

export function calculatePercentage(value: number, total: number) {
  if (value === 0) value;
  return Number(((value / total) * 100).toFixed(2));
}

export function getIsObrar(posicaoId: string) {
  if (!posicaoId) return false;
  return ['2.1.4', '2.2.1', '2.2.2'].includes(`${posicaoId}`?.substring(0, 5));
}

export function invalidDataProcessingExecel(
  variavel: any,
  type: string = 'string',
): any {
  if ([null, 'null', 'NULL', undefined, 'undefined'].indexOf(variavel) === -1) {
    return variavel;
  }
  if (type === 'number') {
    return 0;
  }
  return '';
}

export function getSituacaoColaborador(status: string) {
  const TYPE_STATUS: any = {
    ATIVO: 'ATIVO',
    INATIVO: 'INATIVO',
    PENDENTE: 'PENDENTE',
    REDUÇÃO: 'REDUCAO',
  };

  return (
    (TYPE_STATUS[status.toUpperCase()] as
      | 'ATIVO'
      | 'INATIVO'
      | 'PENDENTE'
      | 'REDUCAO') || 'ATIVO'
  );
}

export function getSituacaoPosicao(status: string) {
  const TYPE_STATUS: any = {
    ATIVA: 'ATIVO',
    INATIVO: 'INATIVO',
    PENDENTE: 'PENDENTE',
    REDUÇÃO: 'REDUCAO',
  };

  if (status === 'ATIVA') {
    status = 'ATIVO';
  }
  return (
    (TYPE_STATUS[status.toUpperCase()] as
      | 'ATIVO'
      | 'INATIVO'
      | 'PENDENTE'
      | 'REDUCAO') || 'ATIVO'
  );
}

/**
 *
 * @param statusPosicao
 * @returns POSICAO | GRUPO
 * @description retorna o tipo da posição com base no status
 */
export function getTipoPosicao(statusPosicao: string) {
  return statusPosicao === 'ATIVA' || statusPosicao === 'PENDENTE'
    ? 'POSICAO'
    : 'GRUPO';
}

/**
 *
 * @param expiration
 * @description Converte a string de expiração em milissegundos
 * @example 10s, 5m, 2h, 1d
 * @returns number
 * @throws Error
 */
export function parseExpirationTime(
  expiration: string | number,
  unitType: 'seconds' | 'milliseconds' = 'seconds',
): number {
  const timeUnits: { [key: string]: number } = {
    s: unitType === 'milliseconds' ? 1000 : 1, // segundos
    m: unitType === 'milliseconds' ? 1000 * 60 : 60, // minutos
    h: unitType === 'milliseconds' ? 1000 * 60 * 60 : 3600, // horas
    d: unitType === 'milliseconds' ? 1000 * 60 * 60 * 24 : 86400, // dias
  };

  if (typeof expiration === 'number') {
    return unitType === 'milliseconds' && expiration >= 1000
      ? expiration
      : Math.floor(expiration); // retorna sempre em segundos ou milissegundos diretamente
  }

  const match = expiration.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(
      'Formato inválido. Use algo como "10s", "5m", "2h", ou "1d".',
    );
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  return value * timeUnits[unit]; // Retorna o valor em milissegundos ou segundos
}

export function getCountAgrupamentoByField(
  data: any[],
  field: string,
  isCount: boolean = false,
) {
  const agrupamento: any = {};
  data.forEach(e => {
    if (e[field]) {
      if (!agrupamento[e[field]]) {
        agrupamento[e[field]] = 1;
      } else {
        agrupamento[e[field]] += 1;
      }
    }
  });

  return isCount ? Object.keys(agrupamento).length : agrupamento;
}

export function getDiffJson(
  oldData: Record<string, any>,
  newData: Record<string, any>,
): Record<string, { old: any; new: any }> {
  const diff: Record<string, { old: any; new: any }> = {};

  const isObject = (val: any) =>
    val !== null && typeof val === 'object' && !Array.isArray(val);

  const isEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a instanceof Date && b instanceof Date)
      return a.getTime() === b.getTime();
    if (typeof a !== typeof b) return false;
    if (isObject(a) && isObject(b)) {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every(key => isEqual(a[key], b[key]));
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => isEqual(item, b[index]));
    }
    return false;
  };

  for (const key of new Set([
    ...Object.keys(oldData),
    ...Object.keys(newData),
  ])) {
    const oldValue = oldData[key];
    const newValue = newData[key];

    if (!isEqual(oldValue, newValue)) {
      diff[key] = { old: oldValue, new: newValue };
    }
  }

  return diff;
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD') // Normaliza os caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remove os acentos
    .toLowerCase() // Converte para minúsculas
    .trim() // Remove espaços em branco no início e no fim
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/[^\w-]+/g, '') // Remove caracteres não alfanuméricos
    .replace(/--+/g, '-'); // Substitui múltiplos hífens por um único
}
