import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { validateRequest } from './validateRequest';

function runMiddleware(
  middleware: ReturnType<typeof validateRequest>,
  req: Record<string, unknown>,
): boolean {
  let nextCalled = false;
  middleware(req as unknown as Request, {} as Response, () => {
    nextCalled = true;
  });
  return nextCalled;
}

const schema = {
  body: { name: { required: true, type: 'string' as const, minLength: 2 } },
  params: { id: { required: true, type: 'string' as const, pattern: /^[a-f\d]{24}$/i } },
};

test('validateRequest calls next when the payload matches schema', () => {
  const nextCalled = runMiddleware(validateRequest(schema), {
    body: { name: 'Module' },
    params: { id: '507f1f77bcf86cd799439011' },
    query: {},
  });
  assert.equal(nextCalled, true);
});

test('validateRequest throws BadRequestError for invalid fields', () => {
  assert.throws(
    () => runMiddleware(validateRequest(schema), {
      body: { name: '' },
      params: { id: 'invalid-id' },
      query: {},
    }),
    error => {
      assert.equal((error as { statusCode: number }).statusCode, 400);
      assert.match((error as Error).message, /Campos inválidos/);
      assert.match((error as Error).message, /body\.name/);
      assert.match((error as Error).message, /params\.id/);
      return true;
    },
  );
});
