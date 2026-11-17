import assert from 'node:assert/strict';
import * as http from 'node:http';
import test from 'node:test';
import { createGracefulShutdownHandler } from './shutdown';

function listen(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, resolve);
  });
}

test('graceful shutdown closes server and resources', async () => {
  const server = http.createServer();
  await listen(server);

  let resourcesClosed = 0;
  let exitCode: number | undefined;
  const handler = createGracefulShutdownHandler({
    server,
    closeResources: async () => {
      resourcesClosed++;
    },
    exit: code => {
      exitCode = code;
    },
  });

  await handler('SIGTERM');

  assert.equal(server.listening, false);
  assert.equal(resourcesClosed, 1);
  assert.equal(exitCode, 0);
});

test('graceful shutdown ignores repeated signals', async () => {
  const server = http.createServer();

  let resourcesClosed = 0;
  let exitCalls = 0;
  const handler = createGracefulShutdownHandler({
    server,
    closeResources: async () => {
      resourcesClosed++;
    },
    exit: () => {
      exitCalls++;
    },
  });

  await Promise.all([handler('SIGINT'), handler('SIGTERM')]);

  assert.equal(resourcesClosed, 1);
  assert.equal(exitCalls, 1);
});
