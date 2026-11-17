import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from './AppError';

test('AppError variants expose expected status codes and messages', () => {
  const cases = [
    [new BadRequestError({ message: 'bad' }), 400],
    [new UnauthorizedError({ message: 'unauthorized' }), 401],
    [new ForbiddenError({ message: 'forbidden' }), 403],
    [new NotFoundError({ message: 'missing' }), 404],
    [new ConflictError({ message: 'conflict' }), 409],
    [new InternalServerError({ message: 'internal' }), 500],
  ] as const;

  for (const [error, statusCode] of cases) {
    assert.equal(error.statusCode, statusCode);
    assert.equal(error.getMessage().status_code, statusCode);
    assert.equal(error.message, error.getMessage().message);
  }
});
