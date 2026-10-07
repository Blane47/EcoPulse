// Collector email + password accounts: temporary passwords, changing them, resets
import { createRequire } from 'node:module';
import { req, check, done, MONGODB_URI } from './helpers.mjs';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const tag = String(Date.now()).slice(-6);
const admin = (await req('POST', '/auth/login', { body: { email: 'admin@ecopulse.cm', password: 'admin123' } })).data.token;
const created = [];

// No credentials leak anywhere (old PIN hashes are still in the DB before migration)
let r = await req('GET', '/collectors', { token: admin });
check('collector list has no password/pin', r.status === 200 && r.data.every((c) => !('pin' in c) && !('password' in c)));
// A throwaway collector stands in for an existing one (the demo accounts are left alone)
const emm = (await req('POST', '/collectors', { token: admin, body: { name: 'Test Existing Collector', email: `existing${tag}@ecopulse.cm`, zone: 'Molyko' } })).data.collector;
created.push(emm._id);

check('old phone + PIN login rejected', (await req('POST', '/auth/collector-login', { body: { phone: '670000001', pin: '123456' } })).status === 400);
// A collector from before email sign-in (the API can't create one without an email any more)
await mongoose.connect(MONGODB_URI);
const legacy = (await mongoose.connection.db.collection('collectors').insertOne({ name: 'Test Legacy Collector', zone: 'Molyko', status: 'active' })).insertedId;
check('reset refused while collector has no email', (await req('POST', `/collectors/${legacy}/reset-password`, { token: admin })).status === 400);
await mongoose.connection.db.collection('collectors').deleteOne({ _id: legacy });
await mongoose.disconnect();

// Admin adds an email to an existing collector, then issues a temporary password
const emmEmail = `emm.test${tag}@ecopulse.cm`;
check('bad email refused', (await req('PUT', `/collectors/${emm._id}`, { token: admin, body: { email: 'not-an-email' } })).status === 400);
r = await req('PUT', `/collectors/${emm._id}`, { token: admin, body: { email: `  ${emmEmail.toUpperCase()} ` } });
check('admin sets email (normalised)', r.status === 200 && r.data.email === emmEmail);
check('collector cannot reset passwords', (await req('POST', `/collectors/${emm._id}/reset-password`, { token: (await req('POST', '/auth/login', { body: { email: 'admin@ecopulse.cm', password: 'admin123' } })).data.token.slice(0, 5) })).status === 401);
r = await req('POST', `/collectors/${emm._id}/reset-password`, { token: admin });
check('admin reset returns temporary password once', r.status === 200 && r.data.temporaryPassword?.length === 10);
const temp = r.data.temporaryPassword;
check('PUT cannot set password / mustChangePassword', (await req('PUT', `/collectors/${emm._id}`, { token: admin, body: { password: 'hacked123', mustChangePassword: false } })).status === 200
  && (await req('POST', '/auth/collector-login', { body: { email: emmEmail, password: 'hacked123' } })).status === 401);

check('wrong password rejected', (await req('POST', '/auth/collector-login', { body: { email: emmEmail, password: 'wrongpass' } })).status === 401);
check('unknown email gives same error', (await req('POST', '/auth/collector-login', { body: { email: 'nobody@x.cm', password: 'whatever1' } })).data?.message === 'Invalid email or password');
r = await req('POST', '/auth/collector-login', { body: { email: emmEmail.toUpperCase(), password: temp } });
check('login with temporary password (email case-insensitive)', r.status === 200 && r.data.user.mustChangePassword === true && !('password' in r.data.user));
const emmToken = r.data.token;
check('change: wrong current password is 400 (not 401)', (await req('PUT', '/auth/me/password', { token: emmToken, body: { currentPassword: 'nope', newPassword: 'mynewpass1' } })).status === 400);
check('change: must differ from temporary', (await req('PUT', '/auth/me/password', { token: emmToken, body: { currentPassword: temp, newPassword: temp } })).status === 400);
r = await req('PUT', '/auth/me/password', { token: emmToken, body: { currentPassword: temp, newPassword: 'mynewpass1' } });
check('collector changes password', r.status === 200);
r = await req('POST', '/auth/collector-login', { body: { email: emmEmail, password: 'mynewpass1' } });
check('login with new password, no longer must change', r.status === 200 && r.data.user.mustChangePassword === false);
check('temporary password no longer works', (await req('POST', '/auth/collector-login', { body: { email: emmEmail, password: temp } })).status === 401);
check('collector cannot edit own profile via admin endpoint', (await req('PUT', `/collectors/${emm._id}`, { token: r.data.token, body: { status: 'active' } })).status === 403);

// Dashboard Add Collector
const newEmail = `new.collector${tag}@ecopulse.cm`;
check('create needs a valid email', (await req('POST', '/collectors', { token: admin, body: { name: 'X', zone: 'Molyko' } })).status === 400);
r = await req('POST', '/collectors', { token: admin, body: { name: 'Test New Collector', email: newEmail, zone: 'Molyko', password: 'ignored', mustChangePassword: false } });
check('admin creates collector with temporary password', r.status === 201 && r.data.temporaryPassword && r.data.collector.mustChangePassword === true && !('password' in r.data.collector));
created.push(r.data.collector._id);
check('admin-supplied password ignored', (await req('POST', '/auth/collector-login', { body: { email: newEmail, password: 'ignored' } })).status === 401
  && (await req('POST', '/auth/collector-login', { body: { email: newEmail, password: r.data.temporaryPassword } })).status === 200);
check('duplicate email refused', (await req('POST', '/collectors', { token: admin, body: { name: 'Y', email: newEmail.toUpperCase(), zone: 'Molyko' } })).status === 409);

// Resident applies → admin approves → collector signs in
const appPhone = `6551${tag.slice(-5)}`;
const appEmail = `applicant${tag}@gmail.com`;
check('application without email refused', (await req('POST', '/applications', { body: { name: 'Applicant', phone: appPhone, zone: 'Bonduma' } })).status === 400);
check('application with taken collector email refused', (await req('POST', '/applications', { body: { name: 'Applicant', phone: appPhone, zone: 'Bonduma', email: newEmail } })).status === 400);
r = await req('POST', '/applications', { body: { name: 'Test Applicant', phone: appPhone, zone: 'Bonduma', email: appEmail.toUpperCase() } });
check('application stores normalised email', r.status === 201 && r.data.email === appEmail);
r = await req('POST', `/applications/${r.data._id}/create-collector`, { token: admin, body: {} });
check('approval creates email account + temporary password', r.status === 201 && r.data.collector.email === appEmail && r.data.temporaryPassword && r.data.collector.mustChangePassword);
created.push(r.data.collector._id);
check('approved applicant signs in', (await req('POST', '/auth/collector-login', { body: { email: appEmail, password: r.data.temporaryPassword } })).status === 200);

done();
for (const id of created) await req('DELETE', `/collectors/${id}`, { token: admin });
