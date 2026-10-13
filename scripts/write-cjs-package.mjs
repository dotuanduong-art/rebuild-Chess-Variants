import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

await writeFile(resolve('dist/cjs/package.json'), '{"type":"commonjs"}\n');
