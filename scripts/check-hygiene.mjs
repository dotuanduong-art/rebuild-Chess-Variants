import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { root, workspaces } from './workspace-boundaries.mjs';

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (['node_modules', 'dist', '.next', 'coverage'].includes(entry.name)) return [];
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

const sourceFiles = [
  ...workspaces.flatMap((workspace) => files(workspace.path)),
  ...files(resolve(root, 'scripts')),
  ...files(resolve(root, 'tests')),
];
const privateMaterial =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAKIA[A-Z0-9]{16}\b|\bghp_[A-Za-z0-9]{36}\b/;
for (const file of sourceFiles) {
  if (privateMaterial.test(readFileSync(file, 'utf8')))
    throw new Error(`Possible secret material in ${file}`);
}
for (const workspace of workspaces) {
  if (existsSync(resolve(workspace.path, 'package-lock.json')))
    throw new Error('Only the root lockfile is allowed');
}

try {
  const tracked = execFileSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
    .split('\0')
    .filter(Boolean);
  const forbidden = tracked.filter(
    (file) =>
      /(^|\/)(node_modules|dist|\.next|coverage)\/|\.tsbuildinfo$|(^|\/)next-env\.d\.ts$/.test(
        file,
      ) ||
      (/(^|\/)\.env(?:\..*)?$/.test(file) && !file.endsWith('.env.example')),
  );
  if (forbidden.length)
    throw new Error(`Generated artifacts or env secrets tracked: ${forbidden.join(', ')}`);
  console.log('Git tracked artifact/env check: PASS');
} catch (error) {
  if (error.stderr?.toString().includes('not a git repository')) {
    console.log('Git tracked-file check: NOT AVAILABLE (no .git); no commit performed');
  } else throw error;
}
console.log('New workspace/tooling secret-pattern and single-lockfile checks: PASS');
