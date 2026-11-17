import { injectable, inject } from 'tsyringe';
import { NotFoundError } from '@shared/errors/AppError';
import INotificationRepository from '../../repositories/INotificationRepository';

@injectable()
class CreateService {
  constructor(
    @inject('NotificationRepository')
    private repository: INotificationRepository,
  ) {}

  public async execute(id: string) {
    const roleExist = await this.repository.findById(id);
    if (!roleExist) {
      throw new NotFoundError({ message: 'Notification não encontrada' });
    }
    return roleExist;
  }
}

export default CreateService;
