import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { root } from './workspace-boundaries.mjs';

const children = [];
function launch(args, cwd, env) {
  const child = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  let logs = '';
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (data) => {
      logs = (logs + data.toString()).slice(-12000);
    });
  return { child, logs: () => logs };
}

async function waitFor(url, processInfo) {
  const deadline = Date.now() + 30000;
  let lastConnectionError;
  while (Date.now() < deadline) {
    if (processInfo.child.exitCode !== null) throw new Error(processInfo.logs());
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return response;
    } catch (error) {
      lastConnectionError = error;
      // Startup and local connection readiness are retried within a bounded window.
    }
    await setTimeout(250);
  }
  throw new Error(
    `Runtime readiness failed: ${url}; last connection error: ${lastConnectionError?.cause?.code ?? lastConnectionError?.message}\n${processInfo.logs()}`,
  );
}

try {
  const backend = launch(
    [resolve(root, 'apps/backend/dist/main.js')],
    resolve(root, 'apps/backend'),
    { PORT: '4301', HOST: '127.0.0.1' },
  );
  const health = await (await waitFor('http://127.0.0.1:4301/health', backend)).json();
  assert.deepEqual(health, {
    status: 'ok',
    service: 'variant-chess-backend',
    protocolVersion: '0.1.0',
  });
  console.log('Backend /health: HTTP 200, expected JSON');
  const frontend = launch(
    [
      resolve(root, 'node_modules/next/dist/bin/next'),
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      '4300',
    ],
    resolve(root, 'apps/frontend'),
    { NEXT_TELEMETRY_DISABLED: '1' },
  );
  const html = await (await waitFor('http://127.0.0.1:4300/', frontend)).text();
  assert.match(html, /Variant Chess/);
  assert.match(html, /PHASE 01A/);
  console.log('Frontend /: HTTP 200, starter content');
} finally {
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
}
