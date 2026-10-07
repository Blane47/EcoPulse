// Shared by the API test suites. tests/run.mjs sets API_URL and TEST_MONGODB_URI.
export const API = process.env.API_URL || 'http://localhost:5000/api';
export const MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/ecopulse_test';

let pass = 0;
let fail = 0;

export const check = (name, cond, extra = '') => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);
};

export const req = async (method, path, { body, token, device } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (device) headers['X-Device-Token'] = device;
  const r = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try { data = await r.json(); } catch {}
  return { status: r.status, data };
};

// Prints the totals; a failure makes the suite exit non-zero
export const done = () => {
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) process.exitCode = 1;
};
