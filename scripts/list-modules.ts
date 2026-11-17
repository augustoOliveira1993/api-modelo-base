#!/usr/bin/env node
/**
 * list-modules.ts
 * Inventário dos módulos: o que está instalado, em que contexto e sob quais rotas.
 *
 * Uso:
 *   yarn modules:list
 *   yarn modules:list --json
 *   MODULES=users,session,log yarn modules:list
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

import { describeModules } from '@shared/modules';

const ROOT_DIR = process.cwd();
const MODULES_DIR = path.join(ROOT_DIR, 'src', 'modules');

function availableModules(): string[] {
  if (!fs.existsSync(MODULES_DIR)) return [];

  return fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

function main(): number {
  const installed = describeModules();
  const installedNames = new Set(installed.map(module => module.name));
  const notInstalled = availableModules().filter(
    name => !installedNames.has(name),
  );

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ installed, notInstalled }, null, 2));
    return 0;
  }

  const byContext = new Map<string, typeof installed>();
  for (const module of installed) {
    const list = byContext.get(module.context) ?? [];
    list.push(module);
    byContext.set(module.context, list);
  }

  console.log(`\n=== Módulos instalados: ${installed.length} ===\n`);

  for (const contextName of [...byContext.keys()].sort()) {
    console.log(`${contextName}`);
    for (const module of byContext.get(contextName) as typeof installed) {
      const deps =
        module.dependsOn.length > 0
          ? `  depende de: ${module.dependsOn.join(', ')}`
          : '';
      console.log(`  ${module.name.padEnd(20)} ${module.paths.join(' ')}`);
      if (deps) console.log(`  ${' '.repeat(20)}${deps}`);
    }
    console.log('');
  }

  if (notInstalled.length > 0) {
    console.log(`Disponíveis, não instalados: ${notInstalled.join(', ')}\n`);
  }

  const totalRoutes = installed.reduce(
    (total, module) => total + module.paths.length,
    0,
  );
  console.log(`Rotas montadas: ${totalRoutes}`);

  return 0;
}

if (require.main === module) {
  process.exit(main());
}
