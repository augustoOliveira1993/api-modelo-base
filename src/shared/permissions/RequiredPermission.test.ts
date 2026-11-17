import assert from 'node:assert/strict';
import test from 'node:test';
import { getRequiredPermissions, RequiredPermission } from './RequiredPermission';

class PermissionController {
  @RequiredPermission('groups:read', 'groups:update')
  public update(): void {}
}

test('RequiredPermission associates all keys with the decorated method', () => {
  const controller = new PermissionController();

  assert.deepEqual(getRequiredPermissions(controller.update), [
    'groups:read',
    'groups:update',
  ]);
});

test('RequiredPermission rejects empty or blank permission identifiers', () => {
  assert.throws(() => RequiredPermission(), TypeError);
  assert.throws(() => RequiredPermission('  '), TypeError);
});

test('undecorated methods have no required permissions', () => {
  assert.deepEqual(getRequiredPermissions(() => undefined), []);
});
