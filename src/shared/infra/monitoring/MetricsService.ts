import client, { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

const register = new Registry();
client.collectDefaultMetrics({ register });

// Histograma de latência HTTP
const httpLatency = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Latência das requisições HTTP em milissegundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 3000],
  registers: [register],
});

// Contador total de requisições
const httpRequests = new Counter({
  name: 'http_requests_total',
  help: 'Total de requisições HTTP recebidas',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Cache hit/miss
const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total de cache hits',
  labelNames: ['prefix'],
  registers: [register],
});

const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total de cache misses',
  labelNames: ['prefix'],
  registers: [register],
});

// Conexões ativas no MongoDB
const mongoConnections = new Gauge({
  name: 'mongodb_connections_active',
  help: 'Conexões ativas no pool do MongoDB',
  registers: [register],
});

function normalizePath(path: string | undefined): string {
  if (!path) return 'unknown';

  const normalized = path.split('?')[0].replace(/\/+/g, '/');
  const route = normalized.endsWith('/') && normalized !== '/'
    ? normalized.slice(0, -1)
    : normalized;

  return route
    .split('/')
    .map(segment => {
      if (!segment) return segment;
      if (/^[0-9a-f]{24}$/i.test(segment)) return ':objectId';
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          segment,
        )
      ) {
        return ':uuid';
      }
      if (/^\d+$/.test(segment)) return ':number';
      if (segment.length > 48) return ':token';
      return segment;
    })
    .join('/');
}

function normalizeRoutePath(routePath: unknown): string | undefined {
  if (typeof routePath === 'string') return routePath;
  if (Array.isArray(routePath)) {
    const firstRoute = routePath.find(path => typeof path === 'string');
    return firstRoute as string | undefined;
  }
  return undefined;
}

export function getMetricRoute(req: Request): string {
  const routePath = normalizeRoutePath(req.route?.path);

  if (routePath) {
    const baseUrl = req.baseUrl || '';
    const fullRoute = `${baseUrl}${routePath === '/' ? '' : routePath}`;
    return normalizePath(fullRoute || '/');
  }

  return normalizePath(req.path);
}

/** Middleware Express que coleta métricas de latência e contagem por rota */
export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const start = Date.now();
  res.on('finish', () => {
    const route = getMetricRoute(req);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };
    const duration = Date.now() - start;
    httpLatency.observe(labels, duration);
    httpRequests.inc(labels);
  });
  next();
}

/** Handler do endpoint GET /metrics */
export async function metricsHandler(
  _req: Request,
  res: Response,
): Promise<void> {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

/** Incrementa cache hit (chame de RedisClient.getCache ao retornar dado) */
export function recordCacheHit(prefix: string): void {
  cacheHits.inc({ prefix });
}

/** Incrementa cache miss */
export function recordCacheMiss(prefix: string): void {
  cacheMisses.inc({ prefix });
}

/** Atualiza gauge de conexões MongoDB (chame após conectar) */
export function setMongoConnections(count: number): void {
  mongoConnections.set(count);
}

export { register };
