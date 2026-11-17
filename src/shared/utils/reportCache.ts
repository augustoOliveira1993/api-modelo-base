import RedisClient from '@configs/redis.config';
import { logger } from '@shared/utils/logger';

/**
 * Cacheia o resultado de um relatório/dashboard pesado no Redis por
 * `ttlSeconds`. Relatórios financeiros/estoque não precisam ser real-time —
 * uma janela curta de cache reduz carga no Mongo em telas muito acessadas
 * sem arriscar dados visivelmente desatualizados.
 *
 * O cache é só uma otimização: se o Redis estiver indisponível, o relatório
 * ainda deve funcionar (só sem cache), nunca falhar por causa disso.
 */
export const withReportCache = async <T>(
  prefix: string,
  params: Record<string, unknown>,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> => {
  const cacheKey = RedisClient.getDynamicHashKey(
    `REPORT:${prefix}`,
    {},
    params,
  );

  try {
    const cached = await RedisClient.getCache(cacheKey);
    if (cached) {
      return cached as T;
    }
  } catch (error) {
    logger.warn(
      `Falha ao ler cache de relatório (${prefix}): ${(error as Error).message}`,
    );
  }

  const result = await compute();

  try {
    await RedisClient.setCache(cacheKey, result, ttlSeconds);
  } catch (error) {
    logger.warn(
      `Falha ao gravar cache de relatório (${prefix}): ${(error as Error).message}`,
    );
  }

  return result;
};

export default withReportCache;
