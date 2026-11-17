import { injectable, inject } from 'tsyringe';
import { BadRequestError, NotFoundError } from '@shared/errors/AppError';
import { SocketEvents, SocketManager } from '@shared/socket/SocketManager';
import { INotificationDTO } from '../../dto/INotificationDTO';
import INotificationRepository from '../../repositories/INotificationRepository';

@injectable()
export default class ReadNotifyService {
  constructor(
    @inject('NotificationRepository')
    private repository: INotificationRepository,
  ) {}

  public async execute(
    idNotification: string,
    data: INotificationDTO,
    userEmail: string | undefined,
    userId?: string,
    lojaId?: string,
    isAdmin?: boolean,
  ) {
    const notify = await this.repository.findById(idNotification);
    if (!notify) {
      throw new NotFoundError({ message: 'Notification não encontrada' });
    }

    const updateNotification = await this.repository.update(idNotification, {
      is_read: true,
      updated_by: userEmail,
    });
    if (updateNotification?.user) {
      SocketManager.getInstance().emitToUser(
        String(updateNotification.user),
        SocketEvents.NOTIFICATION_READ,
        updateNotification,
      );
    }
    return updateNotification;
  }
}
