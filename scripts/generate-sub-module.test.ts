import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import test from 'node:test';

const scriptPath = path.join(__dirname, 'generate-sub-module.js');

function createWorkspace(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'backend-submodule-generator-'));
  const parentPath = path.join(root, 'src', 'modules', 'catalog');
  fs.mkdirSync(path.join(parentPath, 'container'), { recursive: true });
  fs.mkdirSync(path.join(parentPath, 'permissions'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'shared', 'container'), { recursive: true });
  fs.mkdirSync(path.join(root, 'src', 'shared', 'infra', 'https', 'routes'), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(root, 'boundaries.config.json'),
    JSON.stringify(
      { contexts: { cadastros: { description: 'Cadastros', modules: ['catalog'] } } },
      null,
      2,
    ),
  );
  fs.writeFileSync(
    path.join(parentPath, 'module.ts'),
    "import { defineModule } from '@shared/modules/defineModule';\nimport catalogRouter from './catalogRouter';\n\nexport default defineModule({\n  name: 'catalog',\n  context: 'cadastros',\n  routes: [{ path: '/catalog', router: catalogRouter }],\n});\n",
  );
  fs.writeFileSync(
    path.join(parentPath, 'container', 'index.ts'),
    "import { container } from 'tsyringe';\nimport IExistingRepository from '@modules/catalog/repositories/IExistingRepository';\nimport ExistingRepository from '@modules/catalog/infra/mongo/repositories/ExistingRepository';\n\ncontainer.registerSingleton<IExistingRepository>('ExistingRepository', ExistingRepository);\n",
  );
  fs.writeFileSync(
    path.join(parentPath, 'permissions', 'ACL.ts'),
    "export const ACL = {\n  catalog: { read: 'catalog:read' },\n} as const;\n\nexport default ACL;\n",
  );
  fs.writeFileSync(path.join(root, 'src', 'shared', 'container', 'index.ts'), 'shared DI sentinel\n');
  fs.writeFileSync(
    path.join(root, 'src', 'shared', 'infra', 'https', 'routes', 'index.ts'),
    'global routes sentinel\n',
  );
  return root;
}

function runGenerator(root: string, args: string[]) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

test('generate:sub-module nests the route and inherits parent context, DI and ACL', () => {
  const root = createWorkspace();
  const parentPath = path.join(root, 'src', 'modules', 'catalog');
  const globalContainerPath = path.join(root, 'src', 'shared', 'container', 'index.ts');
  const globalRoutesPath = path.join(root, 'src', 'shared', 'infra', 'https', 'routes', 'index.ts');
  const originalGlobalContainer = fs.readFileSync(globalContainerPath, 'utf8');
  const originalGlobalRoutes = fs.readFileSync(globalRoutesPath, 'utf8');

  try {
    const result = runGenerator(root, ['catalog', 'price-rule']);
    assert.equal(result.status, 0, result.stderr);

    const routePath = path.join(parentPath, 'module.ts');
    const manifest = fs.readFileSync(routePath, 'utf8');
    const router = fs.readFileSync(
      path.join(parentPath, 'submodules', 'price-rule', 'infra', 'https', 'routes', 'priceRuleRouter.ts'),
      'utf8',
    );
    const controller = fs.readFileSync(
      path.join(parentPath, 'submodules', 'price-rule', 'infra', 'https', 'controllers', 'PriceRuleController.ts'),
      'utf8',
    );
    const acl = fs.readFileSync(path.join(parentPath, 'permissions', 'ACL.ts'), 'utf8');
    const container = fs.readFileSync(path.join(parentPath, 'container', 'index.ts'), 'utf8');

    assert.match(manifest, /context: 'cadastros'/);
    assert.match(manifest, /path: '\/catalog\/price-rule'/);
    assert.match(manifest, /@modules\/catalog\/submodules\/price-rule\/infra\/https\/routes\/priceRuleRouter/);
    assert.match(router, /authentication: \[verifyToken\]/);
    assert.match(router, /middleware: \[validateRequest/);
    assert.match(controller, /@RequiredPermission\(ACL\.priceRule\.create\)/);
    assert.match(acl, /priceRule: \{/);
    assert.match(acl, /'price-rule:create'/);
    assert.match(container, /@modules\/catalog\/submodules\/price-rule\/repositories\/IPriceRuleRepository/);
    assert.match(container, /'PriceRuleRepository'/);
    assert.equal(fs.readFileSync(globalContainerPath, 'utf8'), originalGlobalContainer);
    assert.equal(fs.readFileSync(globalRoutesPath, 'utf8'), originalGlobalRoutes);
    assert.equal(fs.existsSync(path.join(parentPath, 'submodules', 'price-rule', 'module.ts')), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('generate:sub-module dry-run performs no writes and validates the parent context', () => {
  const root = createWorkspace();
  const parentPath = path.join(root, 'src', 'modules', 'catalog');
  const manifestPath = path.join(parentPath, 'module.ts');
  const originalManifest = fs.readFileSync(manifestPath, 'utf8');

  try {
    const result = runGenerator(root, ['catalog', 'price-rule', '--dry-run']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Rota: \/api\/catalog\/price-rule/);
    assert.match(result.stdout, /Contexto herdado: cadastros/);
    assert.match(result.stdout, /Nenhum arquivo foi alterado/);
    assert.equal(fs.existsSync(path.join(parentPath, 'submodules')), false);
    assert.equal(fs.readFileSync(manifestPath, 'utf8'), originalManifest);

    fs.writeFileSync(manifestPath, originalManifest.replace("context: 'cadastros'", "context: 'platform'"));
    const mismatchedContext = runGenerator(root, ['catalog', 'price-rule', '--dry-run']);
    assert.notEqual(mismatchedContext.status, 0);
    assert.match(mismatchedContext.stderr, /deve corresponder ao contexto/);
    fs.writeFileSync(manifestPath, originalManifest);

    const invalidName = runGenerator(root, ['catalog', 'PriceRule', '--dry-run']);
    assert.notEqual(invalidName.status, 0);
    assert.match(invalidName.stderr, /kebab-case/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('generate:sub-module rejects duplicate nested routes without modifying parent files', () => {
  const root = createWorkspace();
  const parentPath = path.join(root, 'src', 'modules', 'catalog');

  try {
    const first = runGenerator(root, ['catalog', 'price-rule']);
    assert.equal(first.status, 0, first.stderr);

    const manifestPath = path.join(parentPath, 'module.ts');
    const containerPath = path.join(parentPath, 'container', 'index.ts');
    const aclPath = path.join(parentPath, 'permissions', 'ACL.ts');
    const before = [manifestPath, containerPath, aclPath].map(filePath =>
      fs.readFileSync(filePath, 'utf8'),
    );
    const duplicate = runGenerator(root, ['catalog', 'price-rule', '--force']);
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /já registra a rota/);
    assert.deepEqual(
      [manifestPath, containerPath, aclPath].map(filePath => fs.readFileSync(filePath, 'utf8')),
      before,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
