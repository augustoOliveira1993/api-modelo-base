#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';

function collectTestFiles(directory: string, files: string[] = []): string[] {
  if (!fs.existsSync(directory)) return files;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectTestFiles(filePath, files);
    else if (entry.isFile() && entry.name.endsWith('.test.js')) files.push(filePath);
  }

  return files;
}

function main(): void {
  const root = process.cwd();
  const testFiles = collectTestFiles(path.join(root, 'dist')).sort();
  if (testFiles.length === 0) {
    console.error('Nenhum arquivo .test.js compilado foi encontrado em dist/.');
    process.exitCode = 1;
    return;
  }

  const testOptions = process.argv.slice(2);
  const result = spawnSync(
    process.execPath,
    [...testOptions, '--test', ...testFiles],
    { cwd: root, stdio: 'inherit' },
  );

  if (result.error) {
    console.error(`Falha ao iniciar o runner de testes: ${result.error.message}`);
    process.exitCode = 1;
    return;
  }

  process.exitCode = result.status ?? 1;
}

if (require.main === module) main();
