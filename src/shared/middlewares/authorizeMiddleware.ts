import { Request, RequestHandler } from 'express';
import { container } from 'tsyringe';
import GetAbilityUserAuthService from '@modules/users/services/auth/GetAbilityUserAuthService';
import { ForbiddenError, UnauthorizedError } from '@shared/errors/AppError';

function matchesPermission(userPermission: string, requiredPermission: string): boolean {
  if (userPermission === '*' || userPermission === requiredPermission) return true;

  const [requiredScope] = requiredPermission.split(':');
  return userPermission === `${requiredScope}:*`;
}

export function hasRequiredPermissions(
  userPermissions: string[],
  requiredPermissions: string[],
): boolean {
  if (requiredPermissions.length === 0) return true;

  return requiredPermissions.every(requiredPermission =>
    userPermissions.some(userPermission =>
      matchesPermission(userPermission, requiredPermission),
    ),
  );
}

async function getRequestAbilities(req: Request): Promise<string[]> {
  if (req.abilities) return req.abilities;

  if (!req.userId) {
    throw new UnauthorizedError({
      message: 'Usuário não autenticado',
      title: 'Falha na autorização!',
    });
  }

  const service = container.resolve(GetAbilityUserAuthService);
  const abilityContext = await service.execute(req.userId);
  req.abilities = abilityContext.ability;

  if (abilityContext.isAdmin) {
    req.is_admin = true;
  }

  return req.abilities;
}

export function authorize(...requiredPermissions: string[]): RequestHandler {
  return async (req, _res, next) => {
    if (req.is_admin) {
      next();
      return;
    }

    const userPermissions = await getRequestAbilities(req);

    if (!hasRequiredPermissions(userPermissions, requiredPermissions)) {
      throw new ForbiddenError({
        message: `Permissão insuficiente. Requer: ${requiredPermissions.join(', ')}`,
        title: 'Acesso negado!',
      });
    }

    next();
  };
}

export function authorizeAdmin(): RequestHandler {
  return (req, _res, next) => {
    if (req.is_admin) {
      next();
      return;
    }

    throw new ForbiddenError({
      message: 'Acesso restrito a administradores',
      title: 'Acesso negado!',
    });
  };
}
