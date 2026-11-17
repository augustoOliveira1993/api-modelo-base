import 'reflect-metadata';
import '@shared/container';
import express, { Request, Response } from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { addLogRotate } from '@shared/utils/logger';
import routes from '@shared/infra/https/routes';
import { connectDB } from '@configs/database/mongodb.config';
import uploadConfig from '@configs/storage/upload.config';
import cron from 'node-cron';
import https from 'https';
import http from 'http';
import { ServerOptions } from 'https';
import { globalRateLimiter } from '@shared/middlewares/rateLimiter';
import {
  metricsMiddleware,
  metricsHandler,
} from '@shared/infra/monitoring/MetricsService';
import { healthHandler } from '@shared/infra/https/health/HealthService';
import { isEnabled } from '@configs/features.config';
import { ErrorMiddleware } from '@shared/middlewares/errorMiddleware';
import { routeMonitor } from '@shared/middlewares/routeMonitor';
import { auditMiddleware } from '@shared/middlewares/auditMiddleware';
import { requestIdMiddleware } from '@shared/middlewares/requestId';
import {
  openApiDocsHandler,
  openApiJsonHandler,
} from '@shared/infra/https/openapi/openapiHandler';

export interface IHttpsServerOption extends ServerOptions {
  key: string | NonSharedBuffer;
  cert: string | NonSharedBuffer;
  ca?: string | NonSharedBuffer;
}

export class AppServer {
  public server: express.Application;
  public httpServer: https.Server | http.Server;
  private cronTasks: ReturnType<typeof cron.schedule>[] = [];

  constructor(httpsServerOptions?: IHttpsServerOption) {
    addLogRotate('./logs');
    this.server = express();
    if (httpsServerOptions) {
      this.httpServer = https.createServer(httpsServerOptions, this.server);
    } else {
      this.httpServer = http.createServer(this.server);
    }
    connectDB();
    this.middlewares();
    this.routes();
    if (process.env.NODE_ENV === 'production') {
      this.initCrons();
    }
    this.errorMiddleware();
  }

  /**
   * Registre aqui as tarefas agendadas da aplicação. Cada task precisa ser
   * empurrada em `this.cronTasks` para que `shutdown()` consiga pará-la.
   *
   * @example
   * this.cronTasks.push(
   *   cron.schedule('0 3 * * *', async () => {
   *     await container.resolve(PurgeExpiredSessionsService).execute();
   *   }),
   * );
   */
  private initCrons() {
    // Sem tarefas agendadas por padrão.
  }

  private middlewares() {
    // CORS PRIMEIRO, antes de qualquer coisa que possa encerrar a requisição.
    // Se o rate limiter responder 429 sem os headers CORS, o browser mostra um
    // erro de CORS genérico em vez do 429 — e o preflight OPTIONS consome quota.
    this.server.use(
      cors({
        origin: process.env.CORS,
      }),
    );
    this.server.use(requestIdMiddleware);
    if (isEnabled('HELMET')) this.server.use(helmet());
    if (isEnabled('FEATURE_ROUTE_MONITORING')) this.server.use(routeMonitor);
    this.server.use(express.json());
    if (isEnabled('MONGO_SANITIZE')) this.server.use(mongoSanitize());
    if (isEnabled('RATE_LIMIT')) this.server.use(globalRateLimiter);
    if (isEnabled('METRICS')) this.server.use(metricsMiddleware);
    this.server.use('/files', express.static(uploadConfig.directory));
  }


  private routes() {
    if (isEnabled('HEALTH_CHECK')) this.server.get('/health', healthHandler);
    if (isEnabled('METRICS')) this.server.get('/metrics', metricsHandler);
    if (isEnabled('OPENAPI')) {
      this.server.get('/openapi.json', openApiJsonHandler);
      this.server.get('/docs', openApiDocsHandler);
    }

    // Auditoria automática (deve vir ANTES das rotas para interceptar respostas)
    this.server.use(auditMiddleware);

    this.server.use('/api', routes);

    this.server.get('/', (_: Request, res: Response) => {
      res.json({
        success: true,
        message: 'Welcome to API Base TS',
        status: 'Online e funcionando.',
      });
    });
  }

  private errorMiddleware() {
    this.server.use(ErrorMiddleware.handle);
  }

  public async shutdown(): Promise<void> {
    this.cronTasks.forEach(task => task.stop());
    this.cronTasks = [];
  }
}
