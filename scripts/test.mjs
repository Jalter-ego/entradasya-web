import { mkdirSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
mkdirSync(new URL('../reports/', import.meta.url), { recursive: true });
const files = readdirSync(new URL('../tests/', import.meta.url))
  .filter((file) => file.endsWith('.test.mjs'))
  .sort()
  .map((file) => `tests/${file}`);
if (files.length === 0) throw new Error('No se encontraron pruebas.');

const result = spawnSync(process.execPath, [
  '--import', './tests/register-typescript.mjs',
  '--test',
  '--test-isolation=none',
  '--test-reporter=spec',
  '--test-reporter=junit',
  '--test-reporter-destination=stdout',
  '--test-reporter-destination=reports/junit.xml',
  ...files,
], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
