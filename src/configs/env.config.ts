import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'test' | 'production';

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);
const NODE_ENV_ALIASES: Record<string, NodeEnv> = {
  dev: 'development',
  developer: 'development',
  develoloper: 'development',
  local: 'development',
  prod: 'production',
};

function isTrue(value: string | undefined): boolean {
  return TRUE_VALUES.has(String(value).toLowerCase());
}

function requireEnv(name: string, errors: string[]): void {
  if (!process.env[name] || String(process.env[name]).trim() === '') {
    errors.push(name);
  }
}

function validateEnv(): void {
  const errors: string[] = [];
  const rawNodeEnv = process.env.NODE_ENV || 'development';
  const normalizedNodeEnv =
    NODE_ENV_ALIASES[rawNodeEnv.toLowerCase()] || rawNodeEnv;

  if (!['development', 'test', 'production'].includes(normalizedNodeEnv)) {
    errors.push('NODE_ENV must be development, test or production');
  }

  const nodeEnv = normalizedNodeEnv as NodeEnv;

  process.env.NODE_ENV = nodeEnv;

  requireEnv('PORT', errors);
  requireEnv('SECRET', errors);
  requireEnv('REFRESH_SECRET', errors);

  if (nodeEnv === 'production') {
    requireEnv('MONGODB_URI', errors);
    requireEnv('CORS', errors);
  } else {
    requireEnv('MONGODB_URI_DEV', errors);
  }

  if (isTrue(process.env.HTTPS_ENABLED)) {
    requireEnv('KEY_KEY', errors);
    requireEnv('KEY_CERT', errors);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration: ${errors.join(', ')}`);
  }
}

validateEnv();

export const env = {
  nodeEnv: process.env.NODE_ENV as NodeEnv,
  port: process.env.PORT as string,
  appWebUrl: process.env.APP_WEB_URL || 'http://localhost',
  httpsEnabled: isTrue(process.env.HTTPS_ENABLED),
  keyPath: process.env.KEY_KEY,
  certPath: process.env.KEY_CERT,
  caPath: process.env.KEY_CA,
  shutdownTimeoutMs: Number(process.env.GRACEFUL_SHUTDOWN_TIMEOUT_MS) || 10000,
};
