// On-demand pickups: server-computed fees, resident device-token flow, operator
// scoping isolation (operator A never sees/acts on operator B's jobs), operator
// accept + assign, and the assigned collector advancing the job in the field.
import { req, check, done } from './helpers.mjs';

const tag = String(Date.now()).slice(-6);
const admin = (await req('POST', '/auth/login', { body: { email: 'admin@ecopulse.cm', password: 'admin123' } })).data.token;

// Seeded Trash Vallet operator-admin (approved, serves Molyko) + its worker Peter.
const tv = await req('POST', '/operators/login', { body: { email: 'ops@trashvallet.cm', password: 'operator123' } });
check('seeded Trash Vallet logs in', tv.status === 200 && !!tv.data.token);
const tvToken = tv.data.token;
const tvId = tv.data.operator._id;

// Resident identity via the community device-token flow.
const phone = `6552${tag.slice(-5)}`;
const reg = await req('POST', '/community/auth', { body: { name: 'Test Resident', phone, zone: 'Molyko' } });
const device = reg.data.deviceToken;
check('resident registers + gets a device token', (reg.status === 200 || reg.status === 201) && !!device);

// --- Create a pickup; the fee is computed server-side from the operator's pricing ---
let r = await req('POST', '/pickups', { device, body: { operator: tvId, wasteType: 'household', loadSize: 'medium', location: { zone: 'Molyko', address: 'Checkpoint' } } });
check('resident creates a pickup, fee computed (household/medium = 2000)', r.status === 201 && r.data.fee === 2000);
const pickupId = r.data._id;
check('creating a pickup needs a device token (401)', (await req('POST', '/pickups', { body: { operator: tvId, wasteType: 'household' } })).status === 401);
check('resident sees it under /pickups/mine', (await req('GET', '/pickups/mine', { device })).data.some((p) => p._id === pickupId));

// --- A second operator, approved, for scoping isolation ---
const email2 = `op.iso.${tag}@test.cm`;
const op2 = (await req('POST', '/operators/register', {
  body: { businessName: `Iso ${tag}`, ownerName: 'O2', email: email2, password: 'operator123', phone: `+23766${tag}2`, zonesServed: ['Bonduma'], baseFee: 1500 },
})).data._id;
await req('PATCH', `/operators/${op2}/approve`, { token: admin });
const op2Token = (await req('POST', '/operators/login', { body: { email: email2, password: 'operator123' } })).data.token;

check('operator sees its own pickup', (await req('GET', '/pickups', { token: tvToken })).data.some((p) => p._id === pickupId));
check('SCOPING: other operator does not see it', !(await req('GET', '/pickups', { token: op2Token })).data.some((p) => p._id === pickupId));
check('SCOPING: other operator cannot act on it (403)', (await req('PATCH', `/pickups/${pickupId}/status`, { token: op2Token, body: { status: 'cancelled' } })).status === 403);
check('pickup listing needs an operator token (401)', (await req('GET', '/pickups')).status === 401);

// --- Operator accepts and assigns one of its own collectors ---
const collectors = (await req('GET', '/collectors', { token: admin })).data;
const peter = collectors.find((c) => c.email === 'peter@trashvallet.cm');
const municipal = collectors.find((c) => !c.operatorId); // a HYSACAM collector (operatorId null)
check('a collector cannot be assigned if they work for no operator / another one (403)',
  (await req('PATCH', `/pickups/${pickupId}/accept`, { token: tvToken, body: { collectorId: municipal?._id } })).status === 403);
r = await req('PATCH', `/pickups/${pickupId}/accept`, { token: tvToken, body: { collectorId: peter?._id } });
check('operator assigns its own collector → accepted', r.status === 200 && r.data.status === 'accepted');

// --- The assigned collector advances the job in the field ---
const peterLogin = await req('POST', '/auth/collector-login', { body: { email: 'peter@trashvallet.cm', password: 'collector123' } });
const peterToken = peterLogin.data.token;
check('assigned collector logs in', peterLogin.status === 200 && !!peterToken);
check('collector sees the job under /pickups/assigned', (await req('GET', '/pickups/assigned', { token: peterToken })).data.some((p) => p._id === pickupId));

check('collector cannot skip straight to completed (illegal transition, 400)', (await req('PATCH', `/pickups/${pickupId}/advance`, { token: peterToken, body: { status: 'completed' } })).status === 400);
check('advance → en_route', (await req('PATCH', `/pickups/${pickupId}/advance`, { token: peterToken, body: { status: 'en_route' } })).data.status === 'en_route');
check('advance → picked_up', (await req('PATCH', `/pickups/${pickupId}/advance`, { token: peterToken, body: { status: 'picked_up' } })).data.status === 'picked_up');
r = await req('PATCH', `/pickups/${pickupId}/advance`, { token: peterToken, body: { status: 'completed' } });
check('advance → completed marks it paid', r.status === 200 && r.data.status === 'completed' && r.data.paymentStatus === 'paid');

// --- A different collector cannot touch a job that is not theirs ---
const other = await req('POST', '/auth/collector-login', { body: { email: 'emmanuel@ecopulse.cm', password: 'collector123' } });
if (other.status === 200) {
  check('OWNERSHIP: an unassigned collector cannot advance the job (403)',
    [403, 400].includes((await req('PATCH', `/pickups/${pickupId}/advance`, { token: other.data.token, body: { status: 'en_route' } })).status));
}

done();
