import assert from 'node:assert/strict';
import test from 'node:test';
import { getMetricRoute } from './MetricsService';

test('getMetricRoute combines baseUrl with express route path', () => {
  const req = {
    baseUrl: '/api/users',
    path: '/api/users/507f1f77bcf86cd799439011',
    route: { path: '/:id' },
  };

  assert.equal(getMetricRoute(req as never), '/api/users/:id');
});

test('getMetricRoute normalizes ids from fallback path', () => {
  const req = {
    path: '/api/users/507f1f77bcf86cd799439011/sessions/123/history/550e8400-e29b-41d4-a716-446655440000',
  };

  assert.equal(
    getMetricRoute(req as never),
    '/api/users/:objectId/sessions/:number/history/:uuid',
  );
});

test('getMetricRoute removes query strings and trailing slashes from fallback paths', () => {
  const req = { path: '/api/notifications/123/?page=1' };
  assert.equal(getMetricRoute(req as never), '/api/notifications/:number');
});
