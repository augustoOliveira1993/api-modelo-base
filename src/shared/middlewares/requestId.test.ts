import assert from 'node:assert/strict';
import test from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { requestIdMiddleware } from './requestId';

function createResponseMock() {
  return {
    locals: {} as Record<string, unknown>,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
    },
  };
}

test('requestIdMiddleware reuses incoming x-request-id', () => {
  const req = { headers: { 'x-request-id': 'request-123' } };
  const res = createResponseMock();
  let nextCalled = false;

  requestIdMiddleware(
    req as unknown as Request,
    res as unknown as Response,
    (() => {
      nextCalled = true;
    }) as NextFunction,
  );

  assert.equal((req as unknown as Request & { requestId?: string }).requestId, 'request-123');
  assert.equal(res.locals.requestId, 'request-123');
  assert.equal(res.headers['X-Request-Id'], 'request-123');
  assert.equal(nextCalled, true);
});

test('requestIdMiddleware generates an id when the header is absent', () => {
  const req = { headers: {} };
  const res = createResponseMock();

  requestIdMiddleware(
    req as unknown as Request,
    res as unknown as Response,
    (() => undefined) as NextFunction,
  );

  const requestId = (req as unknown as Request & { requestId?: string }).requestId;
  assert.equal(typeof requestId, 'string');
  assert.ok(requestId && requestId.length > 0);
  assert.equal(res.locals.requestId, requestId);
  assert.equal(res.headers['X-Request-Id'], requestId);
});
