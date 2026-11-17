import 'reflect-metadata';
import 'express-async-errors';

import assert from 'node:assert/strict';
import test from 'node:test';
import express, {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import { ForbiddenError } from '@shared/errors/AppError';
import { RequiredPermission } from '@shared/permissions/RequiredPermission';
import { defineRoutes } from './defineRoutes';

let protectedControllerEvents: string[] = [];

class ProtectedController {
  @RequiredPermission('files:upload')
  public upload(_req: Request, res: Response): void {
    protectedControllerEvents.push('handler');
    res.status(201).send('uploaded');
  }
}

class PublicController {
  public index(_req: Request, res: Response): void {
    res.status(200).send('public');
  }
}

async function withServer<T>(
  app: express.Express,
  callback: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    if (server.listening) {
      resolve();
      return;
    }
    server.once('error', reject);
    server.once('listening', resolve);
  });
  const address = server.address();

  if (
    !address ||
    typeof address === 'string' ||
    typeof address.port !== 'number'
  ) {
    server.close();
    throw new Error('O servidor de teste não abriu uma porta TCP.');
  }

  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
}

const permissionErrorHandler: ErrorRequestHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (error instanceof ForbiddenError) {
    res.status(403).json({ message: error.message });
    return;
  }

  next(error);
};

test('defineRoutes orders auth and route middleware before the controller', async () => {
  const events: string[] = [];
  protectedControllerEvents = events;
  const controller = new ProtectedController();
  const router = defineRoutes({
    authentication: [(req, _res, next) => {
      events.push('auth');
      req.abilities = ['files:upload'];
      next();
    }],
    beforeMiddleware: [(_req, _res, next) => {
      events.push('before');
      next();
    }],
    afterMiddleware: [() => {
      events.push('after');
    }],
    routes: [
      {
        method: 'POST',
        path: '/files',
        handler: controller.upload,
        middleware: [(_req, _res, next) => {
          events.push('upload');
          next();
        }],
      },
    ],
  });
  const app = express();
  app.use(router);
  app.use(permissionErrorHandler);

  await withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/files`, { method: 'POST' });
    assert.equal(response.status, 201);
    assert.equal(await response.text(), 'uploaded');
  });

  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(events, ['before', 'auth', 'upload', 'handler', 'after']);
});

test('authorization denial stops upload and runs afterMiddleware once', async () => {
  const events: string[] = [];
  protectedControllerEvents = events;
  const controller = new ProtectedController();
  const router = defineRoutes({
    authentication: [(req, _res, next) => {
      events.push('auth');
      req.abilities = [];
      next();
    }],
    afterMiddleware: [() => {
      events.push('after');
    }],
    routes: [
      {
        method: 'POST',
        path: '/files',
        handler: controller.upload,
        middleware: [(_req, _res, next) => {
          events.push('upload');
          next();
        }],
      },
    ],
  });
  const app = express();
  app.use(router);
  app.use(permissionErrorHandler);

  await withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/files`, { method: 'POST' });
    assert.equal(response.status, 403);
  });

  await new Promise<void>(resolve => setImmediate(resolve));
  assert.deepEqual(events, ['auth', 'after']);
});

test('authentication denial returns 401 and skips route middleware and controller', async () => {
  const events: string[] = [];
  protectedControllerEvents = events;
  const controller = new ProtectedController();
  const router = defineRoutes({
    authentication: [(_req, res) => {
      events.push('auth');
      res.status(401).send('unauthorized');
    }],
    routes: [
      {
        method: 'POST',
        path: '/files',
        handler: controller.upload,
        middleware: [(_req, _res, next) => {
          events.push('upload');
          next();
        }],
      },
    ],
  });
  const app = express();
  app.use(router);

  await withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/files`, { method: 'POST' });
    assert.equal(response.status, 401);
    assert.equal(await response.text(), 'unauthorized');
  });

  assert.deepEqual(events, ['auth']);
});

test('public routes explicitly skip inherited authentication', async () => {
  let authenticationCalls = 0;
  const controller = new PublicController();
  const router = defineRoutes({
    authentication: [(_req, _res, next) => {
      authenticationCalls++;
      next();
    }],
    routes: [
      {
        method: 'GET',
        path: '/',
        auth: false,
        handler: controller.index,
      },
    ],
  });
  const app = express();
  app.use(router);

  await withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'public');
  });

  assert.equal(authenticationCalls, 0);
});

test('defineRoutes rejects ambiguous or insecure route configurations', () => {
  const publicController = new PublicController();
  const protectedController = new ProtectedController();

  assert.throws(
    () => defineRoutes({
      routes: [{ method: 'GET', path: '/', handler: publicController.index }],
    }),
    /deve declarar auth: false/,
  );

  assert.throws(
    () => defineRoutes({
      routes: [{ method: 'GET', path: '/', auth: true, handler: publicController.index }],
    }),
    /sem middleware configurado/,
  );

  assert.throws(
    () => defineRoutes({
      routes: [{ method: 'POST', path: '/', auth: false, handler: protectedController.upload }],
    }),
    /não pode ser pública/,
  );

  assert.throws(
    () => defineRoutes({
      authentication: ((
        _req: Request,
        _res: Response,
        next: NextFunction,
      ) => next()) as unknown as RequestHandler[],
      routes: [{ method: 'GET', path: '/', auth: false, handler: publicController.index }],
    }),
    /authentication deve ser um array de funções/,
  );
});

test('afterMiddleware failures do not change the completed response', async () => {
  const controller = new PublicController();
  const router = defineRoutes({
    afterMiddleware: [() => {
      throw new Error('hook failure');
    }],
    routes: [
      {
        method: 'GET',
        path: '/',
        auth: false,
        handler: controller.index,
      },
    ],
  });
  const app = express();
  app.use(router);

  await withServer(app, async baseUrl => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'public');
  });
});
