import { SocketEvents, SocketManager } from '@shared/socket/SocketManager';
import { injectable, inject } from 'tsyringe';
import moment from 'moment-timezone';
import { INotificationDTO } from '../../dto/INotificationDTO';
import INotificationRepository from '../../repositories/INotificationRepository';

@injectable()
export default class CreateAndNotifyService {
  constructor(
    @inject('NotificationRepository')
    private repository: INotificationRepository,
  ) {}

  public async execute(
    data: INotificationDTO,
    option: {
      userEmail?: string;
      isPermitDuplicate?: boolean;
      lojaId?: string;
      notifyAdmins?: boolean;
    } = {
      isPermitDuplicate: false,
    },
  ) {
    const expireAt = moment().add(7, 'days');
    const isAdminAudience =
      option.notifyAdmins || data.metadata?.audience === 'admins';
    const normalizedMetadata = {
      ...(data.metadata || {}),
      ...(option.lojaId ? { loja: data.metadata?.loja || option.lojaId } : {}),
      ...(isAdminAudience ? { audience: 'admins' } : {}),
    };
    const normalizedData = {
      ...data,
      ...(isAdminAudience ? { user: undefined } : {}),
      metadata: normalizedMetadata,
    };

    if (!option.isPermitDuplicate) {
      const duplicateQuery: Record<string, any> = {
        message: normalizedData.message,
        type: normalizedData.type,
        is_read: false,
      };

      const contextId = normalizedData.metadata?.contextId;
      if (contextId) {
        duplicateQuery['metadata.contextId'] = contextId;
      }
      if (isAdminAudience) {
        duplicateQuery['metadata.audience'] = 'admins';
        if (normalizedData.metadata?.loja) {
          duplicateQuery['metadata.loja'] = normalizedData.metadata.loja;
        }
      } else if (normalizedData.user) {
        duplicateQuery.user = normalizedData.user;
      } else {
        const loja = normalizedData.metadata?.loja || option.lojaId;
        if (loja) {
          duplicateQuery['metadata.loja'] = loja;
        }
      }

      const exitNotify = await this.repository.findOne(duplicateQuery);
      if (!exitNotify) {
        const created = await this.repository.create({
          ...normalizedData,
          created_by: option?.userEmail,
          expiresAt: expireAt.toDate(),
        });

        this.emitNotification(created, option.lojaId);
        return {
          success: true,
          message: 'Notification criada com sucesso!',
          data: created,
        };
      }

      return {
        success: true,
        message: 'Notification duplicada ignorada.',
        data: exitNotify,
      };
    }

    const created = await this.repository.create({
      ...normalizedData,
      created_by: option?.userEmail,
      expiresAt: expireAt.toDate(),
    });

    this.emitNotification(created, option.lojaId);

    return {
      success: true,
      message: 'Notification criada com sucesso!',
      data: created,
    };
  }

  private emitNotification(notification: INotificationDTO, lojaId?: string) {
    const socket = SocketManager.getInstance();
    const notificationLoja = notification.metadata?.loja || lojaId;
    const isAdminAudience = notification.metadata?.audience === 'admins';

    if (isAdminAudience && notificationLoja) {
      socket.emitToLojaAdmins(
        String(notificationLoja),
        SocketEvents.NOTIFICATION_CREATED,
        notification,
      );
      return;
    }

    if (notification.user) {
      socket.emitToUser(
        String(notification.user),
        SocketEvents.NOTIFICATION_CREATED,
        notification,
      );
      return;
    }

    if (notificationLoja) {
      socket.emitToLoja(
        String(notificationLoja),
        SocketEvents.NOTIFICATION_CREATED,
        notification,
      );
    }
  }
}
