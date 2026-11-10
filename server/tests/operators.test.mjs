// Private operators: self-registration, super-admin approval lifecycle, the
// public "available" listing, operator-admin login, and self-ownership scoping.
import { req, check, done } from './helpers.mjs';

const tag = String(Date.now()).slice(-6);
const admin = (await req('POST', '/auth/login', { body: { email: 'admin@ecopulse.cm', password: 'admin123' } })).data.token;

// --- Super-admin gate on the full list ---
check('operator list needs a token', (await req('GET', '/operators')).status === 401);
let r = await req('GET', '/operators', { token: admin });
check('admin lists all operators', r.status === 200 && Array.isArray(r.data));

// --- Self-registration starts life pending ---
const emailA = `op.a.${tag}@test.cm`;
r = await req('POST', '/operators/register', {
  body: {
    businessName: `Alpha Haul ${tag}`, ownerName: 'Owner A', email: emailA, password: 'operator123',
    phone: `+23765${tag}1`, zonesServed: ['Molyko'], baseFee: 1500, pricing: { household: 1500 },
  },
});
check('register returns a pending operator', r.status === 201 && r.data.status === 'pending');
const opA = r.data._id;
check('password never returned', r.status === 201 && !('password' in r.data));
check('duplicate email refused (409)', (await req('POST', '/operators/register', {
  body: { businessName: 'dup', ownerName: 'o', email: emailA.toUpperCase(), password: 'operator123' },
})).status === 409);
check('register needs business + owner name', (await req('POST', '/operators/register', {
  body: { email: `x${tag}@test.cm`, password: 'operator123' },
})).status === 400);

// --- Pending operators are not offered to residents ---
check('pending operator is not available', !(await req('GET', `/operators/available?zone=Molyko`)).data.some((o) => o._id === opA));

// --- Approval is super-admin only ---
check('approve needs a token', (await req('PATCH', `/operators/${opA}/approve`)).status === 401);
r = await req('PATCH', `/operators/${opA}/approve`, { token: admin });
check('admin approves (status + approvedBy stamped)', r.status === 200 && r.data.status === 'approved' && !!r.data.approvedBy);
check('approved operator now available in its zone', (await req('GET', `/operators/available?zone=Molyko`)).data.some((o) => o._id === opA));

// --- Operator-admin login ---
r = await req('POST', '/operators/login', { body: { email: emailA, password: 'operator123' } });
check('operator logs in and gets a token', r.status === 200 && !!r.data.token && r.data.operator._id === opA);
const tokenA = r.data.token;
check('wrong operator password rejected', (await req('POST', '/operators/login', { body: { email: emailA, password: 'nope' } })).status === 401);

// --- A second operator, for scoping checks ---
const emailB = `op.b.${tag}@test.cm`;
const opB = (await req('POST', '/operators/register', {
  body: { businessName: `Beta Bins ${tag}`, ownerName: 'Owner B', email: emailB, password: 'operator123', phone: `+23765${tag}2`, zonesServed: ['Bonduma'], baseFee: 1500 },
})).data._id;
await req('PATCH', `/operators/${opB}/approve`, { token: admin });

// --- Self-ownership on profile edits ---
check('operator edits its own profile', (await req('PATCH', `/operators/${opA}`, { token: tokenA, body: { description: 'we are open' } })).status === 200);
check('operator cannot edit another operator (403)', (await req('PATCH', `/operators/${opB}`, { token: tokenA, body: { description: 'hijack' } })).status === 403);
check('an admin token is not an operator-admin (403)', (await req('PATCH', `/operators/${opA}`, { token: admin, body: { description: 'x' } })).status === 403);
check('no token cannot edit a profile (401)', (await req('PATCH', `/operators/${opA}`, { body: { description: 'x' } })).status === 401);

// --- Reject + suspend are distinct statuses, super-admin only ---
check('admin rejects → rejected', (await req('PATCH', `/operators/${opB}/reject`, { token: admin })).data.status === 'rejected');
check('admin suspends → suspended', (await req('PATCH', `/operators/${opA}/suspend`, { token: admin })).data.status === 'suspended');
check('suspended operator drops out of available', !(await req('GET', `/operators/available?zone=Molyko`)).data.some((o) => o._id === opA));
check('suspended operator cannot log in', (await req('POST', '/operators/login', { body: { email: emailA, password: 'operator123' } })).status === 403);

done();
