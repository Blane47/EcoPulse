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
const PORT = process.env.TEST_PORT || '5055';
const API_URL = `http://127.0.0.1:${PORT}/api`;

// Use a real Mongo when TEST_MONGODB_URI is set (CI, or a local server); otherwise
// spin up a throwaway in-memory MongoDB so `npm test` is self-contained — no install.
let mem = null;
let MONGODB_URI = process.env.TEST_MONGODB_URI;
if (!MONGODB_URI) {
  console.log('No TEST_MONGODB_URI — starting an in-memory MongoDB (first run downloads the binary)…');
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  mem = await MongoMemoryServer.create({ instance: { dbName: 'ecopulse_test' } });
  MONGODB_URI = mem.getUri('ecopulse_test');
}

const dbName = new URL(MONGODB_URI.replace(/^mongodb(\+srv)?:/, 'http:')).pathname.slice(1).split('?')[0];
if (!dbName.endsWith('_test')) {
  console.error(`Refusing to run: the tests wipe the database, and "${dbName || '(none)'}" doesn't end in _test.`);
  if (mem) await mem.stop();
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
const seed = spawnSync(process.execPath, ['seed.js'], { cwd: SERVER, env, stdio: 'inherit', timeout: 120000 });
if (seed.signal) { console.error(`Seed killed by ${seed.signal} (timed out)`); if (mem) await mem.stop(); process.exit(1); }
if (seed.status !== 0) { if (mem) await mem.stop(); process.exit(seed.status || 1); }

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
      timeout: 90000,
    });
    if (run.signal) { console.error(`${suite} killed by ${run.signal} (timed out)`); failed.push(suite); }
    else if (run.status !== 0) failed.push(suite);
  }
} catch (err) {
  console.error(err.message);
  failed = ['(startup)'];
} finally {
  stop();
}

console.log(failed.length ? `\nFailed: ${failed.join(', ')}` : `\nAll ${suites.length} suites passed`);
if (mem) await mem.stop();
process.exit(failed.length ? 1 : 0);
