import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';

const scriptPath = path.join(__dirname, 'generate-module.js');

function createWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backend-module-generator-'));
  fs.writeFileSync(
    path.join(root, 'boundaries.config.json'),
    JSON.stringify(
      { contexts: { platform: { description: 'Plataforma', modules: [] } } },
      null,
      2,
    ),
  );
  return root;
}

function runGenerator(root: string, args: string[]) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

test('generate:module dry-run leaves module and context unchanged', () => {
  const root = createWorkspace();
  const boundariesPath = path.join(root, 'boundaries.config.json');
  const originalBoundaries = fs.readFileSync(boundariesPath, 'utf8');

  try {
    const result = runGenerator(root, ['catalog-item', '--context=platform', '--dry-run']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /permissions[\\/]ACL\.ts/);
    assert.match(result.stdout, /Controller\.test\.ts/);
    assert.match(result.stdout, /boundaries\.config\.json registra catalog-item/);
    assert.match(result.stdout, /Nenhum arquivo foi alterado/);
    assert.equal(fs.existsSync(path.join(root, 'src', 'modules', 'catalog-item')), false);
    assert.equal(fs.readFileSync(boundariesPath, 'utf8'), originalBoundaries);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('generate:module writes DSL, ACL, decorators and one valid context entry', () => {
  const root = createWorkspace();

  try {
    const result = runGenerator(root, ['catalog-item', '--context=platform']);
    assert.equal(result.status, 0, result.stderr);

    const modulePath = path.join(root, 'src', 'modules', 'catalog-item');
    const router = fs.readFileSync(
      path.join(modulePath, 'infra', 'https', 'routes', 'catalogItemRouter.ts'),
      'utf8',
    );
    const controller = fs.readFileSync(
      path.join(modulePath, 'infra', 'https', 'controllers', 'CatalogItemController.ts'),
      'utf8',
    );
    const acl = fs.readFileSync(path.join(modulePath, 'permissions', 'ACL.ts'), 'utf8');
    const boundaries = JSON.parse(
      fs.readFileSync(path.join(root, 'boundaries.config.json'), 'utf8'),
    ) as { contexts: { platform: { modules: string[] } } };

    assert.match(router, /defineRoutes\(/);
    assert.match(router, /authentication: \[verifyToken\]/);
    assert.match(router, /middleware: \[validateRequest/);
    assert.doesNotMatch(router, /authorize\(/);
    assert.match(controller, /@RequiredPermission\(ACL\.catalogItem\.create\)/);
    assert.match(acl, /'catalog-item:create'/);
    assert.equal(
      boundaries.contexts.platform.modules.filter(name => name === 'catalog-item').length,
      1,
    );

    const forced = runGenerator(root, ['catalog-item', '--context=platform', '--force']);
    assert.equal(forced.status, 0, forced.stderr);
    const updatedBoundaries = JSON.parse(
      fs.readFileSync(path.join(root, 'boundaries.config.json'), 'utf8'),
    ) as { contexts: { platform: { modules: string[] } } };
    assert.equal(
      updatedBoundaries.contexts.platform.modules.filter(name => name === 'catalog-item').length,
      1,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('generate:module rejects unknown contexts and invalid names before writing', () => {
  const root = createWorkspace();

  try {
    const unknownContext = runGenerator(root, ['catalog-item', '--context=unknown']);
    assert.notEqual(unknownContext.status, 0);
    assert.match(unknownContext.stderr, /Contexto "unknown" não existe/);
    assert.equal(fs.existsSync(path.join(root, 'src', 'modules', 'catalog-item')), false);

    const invalidName = runGenerator(root, ['CatalogItem', '--context=platform']);
    assert.notEqual(invalidName.status, 0);
    assert.match(invalidName.stderr, /kebab-case/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('generate:module public mode marks every route public and omits permission decorators', () => {
  const root = createWorkspace();

  try {
    const result = runGenerator(root, ['public-catalog', '--public', '--dry-run']);
    assert.equal(result.status, 0, result.stderr);

    const writeResult = runGenerator(root, ['public-catalog', '--public', '--context=platform']);
    assert.equal(writeResult.status, 0, writeResult.stderr);
    const modulePath = path.join(root, 'src', 'modules', 'public-catalog');
    const router = fs.readFileSync(
      path.join(modulePath, 'infra', 'https', 'routes', 'publicCatalogRouter.ts'),
      'utf8',
    );
    const controller = fs.readFileSync(
      path.join(modulePath, 'infra', 'https', 'controllers', 'PublicCatalogController.ts'),
      'utf8',
    );

    assert.equal((router.match(/auth: false/g) ?? []).length, 5);
    assert.doesNotMatch(controller, /@RequiredPermission/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
