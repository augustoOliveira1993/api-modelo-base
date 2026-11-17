import assert from 'node:assert/strict';
import test from 'node:test';
import { openApiDocument } from './openapiDocument';

test('openApiDocument exposes base metadata and security scheme', () => {
  assert.equal(openApiDocument.openapi, '3.0.3');
  assert.equal(openApiDocument.info.title, 'Backend Base TS API');
  assert.ok(
    (openApiDocument.components.securitySchemes as Record<string, unknown>)
      .bearerAuth,
  );
});

test('openApiDocument documents core auth and CRUD paths', () => {
  assert.ok(openApiDocument.paths['/auth/signin'].post);
  assert.ok(openApiDocument.paths['/users'].get);
  assert.ok(openApiDocument.paths['/users/{id}'].delete);
  assert.deepEqual(openApiDocument.paths['/users'].get?.security, [{ bearerAuth: [] }]);
});

test('OpenAPI distinguishes public routes and documents auth and permission errors', () => {
  assert.equal(openApiDocument.paths['/users'].post?.security, undefined);
  assert.equal(openApiDocument.paths['/notifications'].get?.security, undefined);
  assert.ok(openApiDocument.paths['/roles/{idRole}/permissions'].post?.responses['401']);
  assert.ok(openApiDocument.paths['/roles/{idRole}/permissions'].post?.responses['403']);
});
