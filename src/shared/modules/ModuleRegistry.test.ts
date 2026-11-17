import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

interface IListedModule {
  name: string;
  context: string;
  dependsOn: string[];
  paths: string[];
}

interface IListModulesPayload {
  installed: IListedModule[];
  notInstalled: string[];
}

const modulesDirectory = path.join(process.cwd(), 'src', 'modules');
const listModulesScript = path.join(process.cwd(), 'scripts', 'list-modules.ts');

function listModules(modules?: string[]) {
  const env = { ...process.env };
  if (modules === undefined) delete env.MODULES;
  else env.MODULES = modules.join(',');

  const result = spawnSync(
    process.execPath,
    [
      '-r',
      'ts-node/register',
      '-r',
      'tsconfig-paths/register',
      listModulesScript,
      '--json',
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...env, TS_NODE_TRANSPILE_ONLY: 'true' },
    },
  );

  return {
    status: result.status,
    output: `${result.stdout || ''}${result.stderr || ''}`,
    json: result.status === 0 ? (JSON.parse(result.stdout) as IListModulesPayload) : null,
  };
}

function moduleDirectories(): string[] {
  return fs
    .readdirSync(modulesDirectory, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

function collectTypeScriptFiles(directory: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectTypeScriptFiles(fullPath, files);
    else if (/\.tsx?$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

function actualDependencies(moduleName: string): string[] {
  const found = new Set<string>();
  const importRegex = /from\s+['"]@modules\/([^/'"]+)/g;

  for (const filePath of collectTypeScriptFiles(path.join(modulesDirectory, moduleName))) {
    const content = fs.readFileSync(filePath, 'utf8');
    let match = importRegex.exec(content);
    while (match !== null) {
      if (match[1] !== moduleName) found.add(match[1]);
      match = importRegex.exec(content);
    }
  }

  return [...found].sort();
}

test('todo módulo atual tem manifesto module.ts', () => {
  const missing = moduleDirectories().filter(
    name => !fs.existsSync(path.join(modulesDirectory, name, 'module.ts')),
  );
  assert.deepEqual(missing, [], `módulos sem module.ts: ${missing.join(', ')}`);
});

test('dependsOn declarado corresponde aos imports entre módulos', () => {
  const { status, json, output } = listModules();
  assert.equal(status, 0, output);
  assert.ok(json);

  const mismatches = json.installed.flatMap(module => {
    const declared = [...module.dependsOn].sort();
    const actual = actualDependencies(module.name);
    return JSON.stringify(declared) === JSON.stringify(actual)
      ? []
      : [`${module.name}: declarado=[${declared}] real=[${actual}]`];
  });
  assert.deepEqual(mismatches, [], mismatches.join('\n'));
});

test('nenhum prefixo de rota é montado duas vezes', () => {
  const { status, json, output } = listModules();
  assert.equal(status, 0, output);
  assert.ok(json);

  const seen = new Map<string, string>();
  const duplicates: string[] = [];
  for (const module of json.installed) {
    for (const routePath of module.paths) {
      if (seen.has(routePath)) duplicates.push(`${routePath} (${seen.get(routePath)} e ${module.name})`);
      seen.set(routePath, module.name);
    }
  }
  assert.deepEqual(duplicates, [], duplicates.join('\n'));
});

test('seleção instala apenas os módulos pedidos', () => {
  const { status, json, output } = listModules(['users', 'session', 'log']);
  assert.equal(status, 0, output);
  assert.ok(json);
  assert.deepEqual(
    json.installed.map(module => module.name).sort(),
    ['log', 'session', 'users'],
  );
  assert.ok(json.notInstalled.includes('notification'));
});

test('seleção com dependência faltando falha citando a dependência real', () => {
  const { status, output } = listModules(['users']);
  assert.notEqual(status, 0);
  assert.match(output, /users.*depende de.*session/s);
});

test('seleção com módulo inexistente falha citando o nome', () => {
  const { status, output } = listModules(['modulo-que-nao-existe']);
  assert.notEqual(status, 0);
  assert.match(output, /modulo-que-nao-existe/);
});
