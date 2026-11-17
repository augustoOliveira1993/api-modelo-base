import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import IUsersRepository from '@modules/users/repositories/IUsersRepository';
import { getPermissionsForUser, isUserAdmin } from '@modules/users/utils/auth';
import { ForbiddenError, UnauthorizedError } from '@shared/errors/AppError';

export const requirePermission =
  (permission: string) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.userId) {
        throw new UnauthorizedError({ message: 'Usuário não autenticado' });
      }

      const usersRepository =
        container.resolve<IUsersRepository>('UsersRepository');
      const user = await usersRepository.findById(req.userId);

      if (!user) {
        throw new UnauthorizedError({ message: 'Usuário não encontrado' });
      }

      if (isUserAdmin(user)) {
        next();
        return;
      }

      const abilities = getPermissionsForUser(user);
      if (!abilities.includes(permission)) {
        throw new ForbiddenError({
          message: 'Você não tem permissão para executar esta ação',
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };

export default requirePermission;
