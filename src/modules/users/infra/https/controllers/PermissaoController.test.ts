import 'reflect-metadata';

import assert from 'node:assert/strict';
import test from 'node:test';

import { ACL } from '@modules/users/permissions/ACL';
import { getRequiredPermissions } from '@shared/permissions/RequiredPermission';

import PermissaoController from './PermissaoController';

test('PermissaoController declara ACL para cada operação', () => {
  const controller = new PermissaoController();

  assert.deepEqual(getRequiredPermissions(controller.findAll), [ACL.permissao.ver]);
  assert.deepEqual(getRequiredPermissions(controller.findById), [ACL.permissao.ver]);
  assert.deepEqual(getRequiredPermissions(controller.create), [ACL.permissao.criar]);
  assert.deepEqual(getRequiredPermissions(controller.update), [ACL.permissao.editar]);
  assert.deepEqual(getRequiredPermissions(controller.delete), [ACL.permissao.excluir]);
});
