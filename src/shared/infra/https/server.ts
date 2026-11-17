import 'reflect-metadata';
import { env } from '@configs/env.config';
import { SocketManager } from '@shared/socket/SocketManager';
import { AppServer, IHttpsServerOption } from './app';
import { logger } from '@shared/utils/logger';
import { readFileSync } from 'fs';
import { isEnabled } from '@configs/features.config';
import { disconnectDB } from '@configs/database/mongodb.config';
import RedisClient from '@configs/redis.config';
import { registerGracefulShutdown } from './shutdown';

function buildHttpsOptions(): IHttpsServerOption | undefined {
  if (!env.httpsEnabled) return undefined;

  return {
    key: readFileSync(env.keyPath as string),
    cert: readFileSync(env.certPath as string),
    ca: env.caPath ? readFileSync(env.caPath) : undefined,
  };
}

const app = new AppServer(buildHttpsOptions());
const socketManager = SocketManager.getInstance();

if (isEnabled('SOCKET_MANAGER')) {
  socketManager.initialize(app.httpServer);
}

app.httpServer.listen(env.port, () => {
  const protocol = env.httpsEnabled ? 'https' : 'http';
  logger.info(
    `${protocol.toUpperCase()} API Base TS online ${env.appWebUrl}:${env.port}`,
  );
});

registerGracefulShutdown({
  server: app.httpServer,
  timeoutMs: env.shutdownTimeoutMs,
  closeResources: async () => {
    await app.shutdown();
    if (isEnabled('SOCKET_MANAGER')) await socketManager.close();
    await RedisClient.disconnect();
    await disconnectDB();
  },
});
