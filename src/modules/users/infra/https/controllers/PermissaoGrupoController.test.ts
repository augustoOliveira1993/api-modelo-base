import 'reflect-metadata';

import assert from 'node:assert/strict';
import test from 'node:test';

import { ACL } from '@modules/users/permissions/ACL';
import { getRequiredPermissions } from '@shared/permissions/RequiredPermission';

import PermissaoGrupoController from './PermissaoGrupoController';

test('PermissaoGrupoController declara ACL para cada operação', () => {
  const controller = new PermissaoGrupoController();

  assert.deepEqual(getRequiredPermissions(controller.findAll), [ACL.grupo.ver]);
  assert.deepEqual(getRequiredPermissions(controller.findById), [ACL.grupo.ver]);
  assert.deepEqual(getRequiredPermissions(controller.create), [ACL.grupo.criar]);
  assert.deepEqual(getRequiredPermissions(controller.update), [ACL.grupo.editar]);
  assert.deepEqual(getRequiredPermissions(controller.delete), [ACL.grupo.excluir]);
});
