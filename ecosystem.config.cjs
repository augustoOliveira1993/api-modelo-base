/**
 * Configuração do PM2.
 *
 * IMPORTANTE — `script` aponta direto para o bundle do Node, e NÃO para `yarn`.
 * Com `script: "yarn", args: "start"` o PM2 gerencia o processo do yarn: o
 * SIGTERM vai para ele e o Node filho nunca o recebe, de modo que todo o
 * graceful shutdown (fechamento de Mongo, Redis, socket.io e drain das
 * conexões HTTP) simplesmente não executa em produção.
 */
module.exports = {
  apps: [
    {
      name: process.env.APP_NAME || 'api-modelo-base',
      cwd: __dirname,
      script: 'dist/shared/infra/https/server.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      // Precisa ser MAIOR que GRACEFUL_SHUTDOWN_TIMEOUT_MS (default 10000),
      // senão o PM2 mata o processo antes de o shutdown terminar.
      kill_timeout: 15000,
      listen_timeout: 10000,
      max_memory_restart: '512M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
