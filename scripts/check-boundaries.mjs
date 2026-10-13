import { checkBoundaries } from './workspace-boundaries.mjs';

const violations = checkBoundaries();
if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Workspace dependency boundaries: PASS (6 workspaces)');
}
