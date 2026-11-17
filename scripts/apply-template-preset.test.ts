import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const presetScript = path.join(__dirname, 'apply-template-preset.js');

function runPreset(args: string[]) {
  return spawnSync(process.execPath, [presetScript, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

function outputOf(result: ReturnType<typeof runPreset>): string {
  return `${result.stdout || ''}${result.stderr || ''}`;
}

test('preset script lists available presets', () => {
  const result = runPreset(['--list']);
  const output = outputOf(result);

  assert.equal(result.status, 0, output);
  assert.match(output, /minimal:/);
  assert.match(output, /enterprise:/);
  assert.match(output, /realtime:/);
  assert.match(output, /observability:/);
});

test('preset script dry-run prints the plan without writing', () => {
  const result = runPreset(['minimal', '--dry-run']);
  const output = outputOf(result);

  assert.equal(result.status, 0, output);
  assert.match(output, /Dry-run ativo/);
  assert.match(output, /FEATURE_REDIS_CACHE=false/);
  assert.match(output, /Nenhum arquivo foi alterado/);
});

test('preset script writes selected env content to the requested path', () => {
  const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-preset-'));
  const outputPath = path.join(tempDir, '.env.enterprise');

  try {
    const result = runPreset(['enterprise', `--output=${outputPath}`]);
    assert.equal(result.status, 0, outputOf(result));

    const content = fs.readFileSync(outputPath, 'utf8');
    assert.match(content, /FEATURE_REDIS_CACHE=true/);
    assert.match(content, /FEATURE_EMAIL_NOTIFICATIONS=true/);
    assert.match(content, /FEATURE_SOCKET_MANAGER=false/);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
