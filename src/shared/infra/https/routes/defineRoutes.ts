import { Request, RequestHandler, Response, Router } from 'express';
import { authorize } from '@shared/middlewares/authorizeMiddleware';
import { logger } from '@shared/utils/logger';
import { getRequiredPermissions } from '@shared/permissions/RequiredPermission';

export type HttpMethod =
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'OPTIONS'
  | 'PATCH'
  | 'POST'
  | 'PUT';

export type AfterResponseMiddleware = (
  req: Request,
  res: Response,
) => void | Promise<void>;

export interface IRouteDefinition {
  method: HttpMethod;
  path: string;
  handler: RequestHandler;
  auth?: boolean;
  middleware?: RequestHandler[];
}

export interface IRouteTableDefinition {
  authentication?: RequestHandler[];
  beforeMiddleware?: RequestHandler[];
  afterMiddleware?: AfterResponseMiddleware[];
  routes: IRouteDefinition[];
}

function toFunctionArray<T>(value: unknown, fieldName: string): T[] {
  if (value === undefined) return [];

  if (!Array.isArray(value) || value.some(item => typeof item !== 'function')) {
    throw new TypeError(`${fieldName} deve ser um array de funções.`);
  }

  return value as T[];
}

function registerAfterResponseHooks(
  hooks: AfterResponseMiddleware[],
): RequestHandler {
  return (req, res, next) => {
    let completed = false;

    const runHooks = (): void => {
      if (completed) return;
      completed = true;

      void (async () => {
        for (const hook of hooks) {
          try {
            await hook(req, res);
          } catch (error) {
            logger.error('Falha em afterMiddleware da rota.', error);
          }
        }
      })();
    };

    res.once('finish', runHooks);
    res.once('close', runHooks);
    next();
  };
}

function registerRoute(
  router: Router,
  definition: IRouteDefinition,
  handlers: RequestHandler[],
): void {
  switch (definition.method) {
    case 'DELETE':
      router.delete(definition.path, ...handlers);
      return;
    case 'GET':
      router.get(definition.path, ...handlers);
      return;
    case 'HEAD':
      router.head(definition.path, ...handlers);
      return;
    case 'OPTIONS':
      router.options(definition.path, ...handlers);
      return;
    case 'PATCH':
      router.patch(definition.path, ...handlers);
      return;
    case 'POST':
      router.post(definition.path, ...handlers);
      return;
    case 'PUT':
      router.put(definition.path, ...handlers);
      return;
    default: {
      const unreachableMethod: never = definition.method;
      throw new TypeError(`Método HTTP não suportado: ${unreachableMethod}`);
    }
  }
}

/**
 * Declara as rotas de um router com autenticação e autorização consistentes.
 * Rotas públicas devem marcar `auth: false` explicitamente.
 */
export function defineRoutes(definition: IRouteTableDefinition): Router {
  if (definition.routes.length === 0) {
    throw new TypeError('defineRoutes exige ao menos uma rota.');
  }

  const router = Router();
  const authentication = toFunctionArray<RequestHandler>(
    definition.authentication,
    'authentication',
  );
  const beforeMiddleware = toFunctionArray<RequestHandler>(
    definition.beforeMiddleware,
    'beforeMiddleware',
  );
  const afterMiddleware = toFunctionArray<AfterResponseMiddleware>(
    definition.afterMiddleware,
    'afterMiddleware',
  );

  if (beforeMiddleware.length > 0) {
    router.use(...beforeMiddleware);
  }

  for (const route of definition.routes) {
    if (!route.path.startsWith('/')) {
      throw new TypeError(
        `O caminho da rota deve começar com '/': ${route.path}`,
      );
    }

    const routeMiddleware = toFunctionArray<RequestHandler>(
      route.middleware,
      `middleware de ${route.method} ${route.path}`,
    );

    const requiredPermissions = getRequiredPermissions(route.handler);
    const authenticationEnabled = route.auth ?? authentication.length > 0;

    if (route.auth === undefined && authentication.length === 0) {
      throw new TypeError(
        `${route.method} ${route.path} deve declarar auth: false ou configurar authentication.`,
      );
    }

    if (authenticationEnabled && authentication.length === 0) {
      throw new TypeError(
        `${route.method} ${route.path} declara autenticação sem middleware configurado.`,
      );
    }

    if (!authenticationEnabled && requiredPermissions.length > 0) {
      throw new TypeError(
        `${route.method} ${route.path} exige permissão e não pode ser pública.`,
      );
    }

    const handlers: RequestHandler[] = [];

    if (afterMiddleware.length > 0) {
      // Registrar o hook antes dos guards permite observá-lo também quando
      // autenticação ou autorização encerra a resposta antecipadamente.
      handlers.push(registerAfterResponseHooks(afterMiddleware));
    }

    if (authenticationEnabled) handlers.push(...authentication);
    if (requiredPermissions.length > 0) {
      handlers.push(authorize(...requiredPermissions));
    }
    handlers.push(...routeMiddleware, route.handler);

    registerRoute(router, route, handlers);
  }

  return router;
}

export default defineRoutes;
