import http from 'http';
import https from 'https';
import { logger } from '@shared/utils/logger';

type Server = http.Server | https.Server;
type ExitFn = (code: number) => never | void;

interface IGracefulShutdownOptions {
  server: Server;
  closeResources: () => Promise<void>;
  timeoutMs?: number;
  exit?: ExitFn;
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!server.listening) {
      resolve();
      return;
    }

    server.close(error => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export function createGracefulShutdownHandler({
  server,
  closeResources,
  timeoutMs = 10000,
  exit = process.exit,
}: IGracefulShutdownOptions) {
  let isShuttingDown = false;

  return async (signal: NodeJS.Signals): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}. Starting graceful shutdown.`);

    const forceExitTimeout = setTimeout(() => {
      logger.error(`Graceful shutdown timed out after ${timeoutMs}ms.`);
      exit(1);
    }, timeoutMs);

    try {
      await closeServer(server);
      await closeResources();
      clearTimeout(forceExitTimeout);
      logger.info('Graceful shutdown completed.');
      exit(0);
    } catch (error) {
      clearTimeout(forceExitTimeout);
      logger.error('Graceful shutdown failed.', error);
      exit(1);
    }
  };
}

export function registerGracefulShutdown(
  options: IGracefulShutdownOptions,
): void {
  const handler = createGracefulShutdownHandler(options);

  process.once('SIGTERM', handler);
  process.once('SIGINT', handler);
}
