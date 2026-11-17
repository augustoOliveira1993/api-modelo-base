import { logger } from '@shared/utils/logger';
import { Server as IOServer, Socket } from 'socket.io';
import dotenv from 'dotenv';
import { Server as HTTPServer } from 'http';

dotenv.config();

/**
 * Eventos de socket da aplicação.
 *
 * Para notificar um usuário específico, use `notificationEvent(userId)` em vez
 * de adicionar uma constante por usuário aqui.
 */
export enum SocketEvents {
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  NOTIFICACAO = 'notificacao',

  NOTIFICATION_CREATED = 'notification:created',
  NOTIFICATION_READ = 'notification:read',
  NOTIFICATION_READ_ALL = 'notification:read-all',

  // Eventos de domínio emitidos pelos módulos operacionais.
  DASHBOARD_UPDATED = 'dashboard:updated',
  ROOM_STATUS_CHANGED = 'room:status-changed',
  STOCK_ALERT = 'stock:alert',
  RESERVATION_REMINDER = 'reservation:reminder',
  VEHICLE_BLACKLIST_ALERT = 'vehicle:blacklist-alert',
  TURNO_CAMAREIRA_REGISTRADO = 'turno-camareira:registrado',
  CONFERENCIA_REGISTRADA = 'conferencia:registrada',
}

/** Canal de notificação direcionado a um usuário: `notificacao:<userId>`. */
export function notificationEvent(userId: string): string {
  return `${SocketEvents.NOTIFICACAO}:${userId}`;
}

export interface ITurnoCamareiraRegistradoPayload {
  turnoCamareiraId: string;
  camareira: string;
  turno: string;
  quartos: string[];
  divergencia: boolean;
}

export interface IConferenciaRegistradaPayload {
  quarto: string;
  turno: string;
  divergencia: boolean;
}

export type SSLConfig = {
  keyPath: string;
  certPath: string;
  caPath?: string;
};

export type SocketManagerOptions = {
  port?: number | string;
  cors?: {
    origin: string;
    methods: string;
    credentials?: boolean;
  };
  ssl?: SSLConfig;
};

const defaultOptions: SocketManagerOptions = {
  cors: {
    origin: process.env.CORS || '*',
    methods: 'GET, POST',
    credentials: true,
  },
};

export class SocketManager {
  private static instance: SocketManager;
  private io!: IOServer;

  private constructor() {}

  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  public initialize(server: HTTPServer, options?: SocketManagerOptions): void {
    if (this.io) return; // já inicializado

    this.io = new IOServer(server, options || defaultOptions);

    this.io.on(SocketEvents.CONNECTION, (socket: Socket) => {
      // Rooms por usuário e por tenant. `socket.data` é preenchido por quem
      // autentica o handshake; sem isso o cliente só recebe broadcast.
      if (socket.data?.userId) {
        socket.join(this.userRoom(socket.data.userId));
      }

      if (socket.data?.lojaId) {
        socket.join(this.lojaRoom(socket.data.lojaId));
        if (socket.data.isAdmin) {
          socket.join(this.adminLojaRoom(socket.data.lojaId));
        }
      }

      for (const lojaId of socket.data?.lojasAssociadas || []) {
        socket.join(this.lojaRoom(lojaId));
        if (socket.data.isAdmin) {
          socket.join(this.adminLojaRoom(lojaId));
        }
      }

      logger.info(
        `[Socket] Cliente conectado! id=${socket.id}, user=${socket.data?.userId}, loja=${socket.data?.lojaId}, Origem=${socket.handshake.headers.origin}`,
      );

      socket.on(SocketEvents.DISCONNECT, () => {
        logger.info(`[Socket] Cliente desconectado! id=${socket.id}, Origem=${socket.handshake.headers.origin}`);
      });
    });

    logger.info(`[Socket.IO] ${process.env.APP_WEB_URL}:${process.env.PORT} iniciado com sucesso`);
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private lojaRoom(lojaId: string): string {
    return `loja:${lojaId}`;
  }

  private adminLojaRoom(lojaId: string): string {
    return `loja:${lojaId}:admins`;
  }

  public emit(event: string, payload: any): void {
    if (!this.io) throw new Error('Socket.IO não inicializado');
    this.io.emit(event, payload);
  }

  public emitToUser(userId: string, event: string, payload: any): void {
    if (!this.io) throw new Error('Socket.IO não inicializado');
    this.io.to(this.userRoom(userId)).emit(event, payload);
  }

  public emitToLoja(lojaId: string, event: string, payload: any): void {
    if (!this.io) throw new Error('Socket.IO não inicializado');
    this.io.to(this.lojaRoom(lojaId)).emit(event, payload);
  }

  public emitToLojaAdmins(lojaId: string, event: string, payload: any): void {
    if (!this.io) throw new Error('Socket.IO não inicializado');
    this.io.to(this.adminLojaRoom(lojaId)).emit(event, payload);
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.io) throw new Error('Socket.IO não inicializado');
    this.io.on(event, callback);
  }

  public getIO(): IOServer {
    if (!this.io) throw new Error('Socket.IO não inicializado');
    return this.io;
  }

  public async close(): Promise<void> {
    if (!this.io) return;

    await new Promise<void>(resolve => {
      this.io.close(() => resolve());
    });

    logger.info('[Socket.IO] encerrado com sucesso');
  }
}
