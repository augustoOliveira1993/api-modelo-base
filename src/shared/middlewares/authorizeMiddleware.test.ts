import 'reflect-metadata';

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import {
  authorize,
  authorizeAdmin,
  hasRequiredPermissions,
} from './authorizeMiddleware';

async function runMiddleware(
  middleware: ReturnType<typeof authorize>,
  req: Record<string, unknown>,
): Promise<boolean> {
  let nextCalled = false;
  await middleware(req as unknown as Request, {} as Response, () => {
    nextCalled = true;
  });
  return nextCalled;
}

test('hasRequiredPermissions supports exact, scoped wildcard and global wildcard', () => {
  assert.equal(hasRequiredPermissions(['users:read'], ['users:read']), true);
  assert.equal(hasRequiredPermissions(['users:*'], ['users:create', 'users:delete']), true);
  assert.equal(hasRequiredPermissions(['*'], ['roles:permissions:update']), true);
  assert.equal(hasRequiredPermissions(['users:read'], ['users:update']), false);
});

test('authorize lets admin requests pass without abilities lookup', async () => {
  const nextCalled = await runMiddleware(authorize('users:delete'), {
    is_admin: true,
  });
  assert.equal(nextCalled, true);
});

test('authorize lets request pass when required abilities are present', async () => {
  const nextCalled = await runMiddleware(authorize('users:read'), {
    userId: 'user-1',
    abilities: ['users:read'],
  });
  assert.equal(nextCalled, true);
});

test('authorize throws ForbiddenError when ability is missing', async () => {
  await assert.rejects(
    () => runMiddleware(authorize('users:update'), {
      userId: 'user-1',
      abilities: ['users:read'],
    }),
    error => {
      assert.equal((error as { statusCode: number }).statusCode, 403);
      assert.match((error as Error).message, /Permissão insuficiente/);
      return true;
    },
  );
});

test('authorize returns unauthorized when no authenticated user is present', async () => {
  await assert.rejects(
    () => runMiddleware(authorize('users:read'), {}),
    error => {
      assert.equal((error as { statusCode: number }).statusCode, 401);
      return true;
    },
  );
});

test('authorizeAdmin only lets admin requests pass', async () => {
  const nextCalled = await runMiddleware(authorizeAdmin(), { is_admin: true });
  assert.equal(nextCalled, true);

  await assert.rejects(
    () => runMiddleware(authorizeAdmin(), { is_admin: false }),
    error => {
      assert.equal((error as { statusCode: number }).statusCode, 403);
      assert.match((error as Error).message, /administradores/);
      return true;
    },
  );
});
