import { injectable, inject } from 'tsyringe';
import { NotFoundError } from '@shared/errors/AppError';
import { SocketEvents, SocketManager } from '@shared/socket/SocketManager';
import { INotificationDTO } from '../../dto/INotificationDTO';
import INotificationRepository from '../../repositories/INotificationRepository';

@injectable()
export default class ReadAllNotifyService {
  constructor(
    @inject('NotificationRepository')
    private repository: INotificationRepository,
  ) {}

  public async execute(
    userEmail: string | undefined,
    userId?: string,
    lojaId?: string,
    isAdmin?: boolean,
  ) {
    const scopeFilters = [
      userId ? { user: userId } : null,
      lojaId
        ? {
            'metadata.loja': lojaId,
            user: { $exists: false },
            'metadata.audience': { $ne: 'admins' },
          }
        : null,
      isAdmin && lojaId
        ? {
            'metadata.loja': lojaId,
            user: { $exists: false },
            'metadata.audience': 'admins',
          }
        : null,
    ].filter(Boolean);

    const updateNotification = await this.repository.updateMany(
      {
        is_read: false,
        ...(scopeFilters.length ? { $or: scopeFilters } : {}),
      },
      {
        is_read: true,
        updated_by: userEmail,
      },
    );
    if (userId) {
      SocketManager.getInstance().emitToUser(
        userId,
        SocketEvents.NOTIFICATION_READ_ALL,
        updateNotification,
      );
    }
    return updateNotification;
  }
}
