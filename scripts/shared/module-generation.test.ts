import assert from 'node:assert/strict';
import test from 'node:test';
import { addAclResource, addModuleToContext, getModuleContext, readBoundariesConfig } from './module-generation';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

test('shared module generation helpers validate and register bounded contexts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backend-boundaries-'));
  const boundariesPath = path.join(root, 'boundaries.config.json');
  fs.writeFileSync(
    boundariesPath,
    JSON.stringify({ contexts: { platform: { modules: ['users'] }, inventory: { modules: [] } } }),
  );

  try {
    const config = readBoundariesConfig(root);
    assert.equal(getModuleContext(config, 'users'), 'platform');
    const updated = addModuleToContext(root, 'items', 'inventory');
    assert.ok(updated);
    assert.deepEqual(JSON.parse(updated).contexts.inventory.modules, ['items']);
    fs.writeFileSync(boundariesPath, updated);
    assert.equal(addModuleToContext(root, 'items', 'inventory'), undefined);
    assert.throws(() => addModuleToContext(root, 'users', 'inventory'), /já pertence ao contexto/);
    assert.throws(() => addModuleToContext(root, 'orders', 'missing'), /não existe/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('shared ACL helper appends a resource and rejects duplicate properties', () => {
  const initial = "export const ACL = {\n  users: { read: 'users:read' },\n} as const;\n";
  const updated = addAclResource(initial, 'items', 'items');
  assert.match(updated, /items: \{/);
  assert.match(updated, /'items:create'/);
  assert.throws(() => addAclResource(updated, 'items', 'items'), /já contém/);
});
