// npm test: seeds a throwaway database, starts the API on a spare port, runs every
// *.test.mjs suite against it, and exits non-zero if any check failed.
//
// The seed wipes the whole database, so the URI must point at a database whose name
// ends in "_test" (default: local MongoDB, database ecopulse_test).
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TESTS = dirname(fileURLToPath(import.meta.url));
const SERVER = join(TESTS, '..');
const MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ecopulse_test';
const PORT = process.env.TEST_PORT || '5055';
const API_URL = `http://127.0.0.1:${PORT}/api`;

const dbName = new URL(MONGODB_URI.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.slice(1);
if (!dbName.endsWith('_test')) {
  console.error(`Refusing to run: the tests wipe the database, and "${dbName || '(none)'}" doesn't end in _test.`);
  process.exit(1);
}

// Explicit values win over server/.env (dotenv never overrides what's already set)
const env = { ...process.env, MONGODB_URI, PORT, JWT_SECRET: process.env.JWT_SECRET || 'test-only-secret' };

const only = process.argv.slice(2);
const suites = readdirSync(TESTS)
  .filter((f) => f.endsWith('.test.mjs'))
  .filter((f) => !only.length || only.some((name) => f.startsWith(name)))
  .sort();

console.log(`Seeding ${dbName}…`);
const seed = spawnSync(process.execPath, ['seed.js'], { cwd: SERVER, env, stdio: 'inherit' });
if (seed.status !== 0) process.exit(seed.status || 1);

const server = spawn(process.execPath, ['index.js'], { cwd: SERVER, env, stdio: ['ignore', 'ignore', 'inherit'] });
const stop = () => { if (server.exitCode === null) server.kill(); };
process.on('exit', stop);

async function waitForApi() {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error('API exited during startup');
    try {
      if ((await fetch(`${API_URL}/health`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('API did not start within 15 seconds');
}

let failed = [];
try {
  await waitForApi();
  for (const suite of suites) {
    console.log(`\n=== ${suite}`);
    const run = spawnSync(process.execPath, [join(TESTS, suite)], {
      cwd: SERVER,
      env: { ...env, API_URL, TEST_MONGODB_URI: MONGODB_URI },
      stdio: 'inherit',
    });
    if (run.status !== 0) failed.push(suite);
  }
} catch (err) {
  console.error(err.message);
  failed = ['(startup)'];
} finally {
  stop();
}

console.log(failed.length ? `\nFailed: ${failed.join(', ')}` : `\nAll ${suites.length} suites passed`);
process.exit(failed.length ? 1 : 0);
