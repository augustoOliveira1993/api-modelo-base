import 'reflect-metadata';

import assert from 'node:assert/strict';
import test from 'node:test';
import { ACL } from '@modules/users/permissions/ACL';
import RoleController from './RoleController';
import { getRequiredPermissions } from '@shared/permissions/RequiredPermission';

test('addPermissionByRoleId declares its existing route permission', () => {
  const controller = new RoleController();

  assert.deepEqual(
    getRequiredPermissions(controller.addPermissionByRoleId),
    [ACL.roles.permissions.update],
  );
});
