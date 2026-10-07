// API: collector sign-in, chat isolation, reports and assignment, applications, collector updates
import { req, check, done } from './helpers.mjs';

const suffix = String(Date.now()).slice(-6);
const residentPhone = `677${suffix}`;

// --- Collector login: email (any case/spacing) + password; credentials never returned
for (const e of ['emmanuel@ecopulse.cm', ' Emmanuel@EcoPulse.cm ']) {
  const r = await req('POST', '/auth/collector-login', { body: { email: e, password: 'collector123' } });
  check(`collector login with "${e}"`, r.status === 200 && r.data.user && !('pin' in r.data.user) && !('password' in r.data.user));
}
const wrong = await req('POST', '/auth/collector-login', { body: { email: 'emmanuel@ecopulse.cm', password: 'nope' } });
check('wrong password rejected', wrong.status === 401);
const emmanuel = (await req('POST', '/auth/collector-login', { body: { email: 'emmanuel@ecopulse.cm', password: 'collector123' } })).data;
const francis = (await req('POST', '/auth/collector-login', { body: { email: 'francis@ecopulse.cm', password: 'collector123' } })).data;
const admin = (await req('POST', '/auth/login', { body: { email: 'admin@ecopulse.cm', password: 'admin123' } })).data;

const list = await req('GET', '/collectors', { token: emmanuel.token });
check('collector list hides credentials', list.status === 200 && list.data.every((c) => !('pin' in c) && !('password' in c)));

// --- Chat isolation
const otherChat = await req('GET', `/chat/${francis.user._id}`, { token: emmanuel.token });
check("collector can't read another collector's chat", otherChat.status === 403);
const ownChat = await req('GET', `/chat/${emmanuel.user._id}`, { token: emmanuel.token });
check('collector can read own chat', ownChat.status === 200);
const chatList = await req('GET', '/chat', { token: emmanuel.token });
check("collector can't list all chats", chatList.status === 403);
const hijack = await req('POST', '/chat', { token: emmanuel.token, body: { chatId: `community_+237${residentPhone}`, text: 'x' } });
check("collector can't post into a resident chat", hijack.status === 403);

// --- Resident device token
const reg = await req('POST', '/community/auth', { body: { name: 'Test Resident', phone: `+237 ${residentPhone}`, zone: 'Molyko' } });
check('resident registers + gets device token', reg.status === 201 && reg.data.deviceToken?.length === 64 && reg.data.user.phone === `+237${residentPhone}`);
const device = reg.data.deviceToken;
const steal = await req('POST', '/community/auth', { body: { name: 'Attacker', phone: residentPhone } });
check('other device cannot claim the number', steal.status === 403 && steal.data.code === 'PHONE_CLAIMED');
const back = await req('POST', '/community/auth', { device, body: { phone: residentPhone, zone: 'Bonduma' } });
check('same device signs back in', back.status === 200 && back.data.returning && back.data.user.name === 'Test Resident');
check('profile lookup by phone removed', (await req('GET', `/community/+237${residentPhone}`)).status === 404);
check('chat without token refused', (await req('GET', '/community/chat')).status === 401);
check('chat with forged token refused', (await req('GET', '/community/chat', { device: 'f'.repeat(64) })).status === 401);
const sent = await req('POST', '/community/chat', { device, body: { text: 'Hello from test' } });
check('resident sends chat as themselves', sent.status === 201 && sent.data.senderName === 'Test Resident' && sent.data.chatId === `community_+237${residentPhone}`);
check('resident reads own chat', (await req('GET', '/community/chat', { device })).data.length === 1);

// --- Reports
const anon = await req('POST', '/reports', { body: { location: 'X', zone: 'Molyko' } });
check('report without device token refused', anon.status === 401);
const rep = await req('POST', '/reports', { device, body: { location: 'Test St', zone: 'Molyko', note: 'full', status: 'collected', assignedCollector: francis.user._id, reporterName: 'Fake' } });
check('report created, protected fields ignored', rep.status === 201 && rep.data.status === 'pending' && !rep.data.assignedCollector && rep.data.reporterName === 'Test Resident');
const mine = await req('GET', '/reports/mine', { device });
check('resident sees own reports', mine.status === 200 && mine.data.some((r) => r._id === rep.data._id));
check('old public report lookup removed', (await req('GET', `/reports/user/+237${residentPhone}`)).status === 404);

// --- Assignment + notifications
const before = (await req('GET', '/notifications', { token: emmanuel.token })).data.unread;
const asg = await req('PATCH', `/reports/${rep.data._id}/assign`, { token: admin.token, body: { collectorId: emmanuel.user._id } });
check('admin assigns report', asg.status === 200 && asg.data.status === 'assigned' && asg.data.assignedCollector.name === 'Emmanuel Ngwa');
check('collector cannot assign', (await req('PATCH', `/reports/${rep.data._id}/assign`, { token: emmanuel.token, body: { collectorId: emmanuel.user._id } })).status === 403);
const notes = (await req('GET', '/notifications', { token: emmanuel.token })).data;
check('collector got a notification', notes.unread === before + 1 && notes.notifications[0].type === 'report_assigned' && notes.notifications[0].report === rep.data._id);
const assigned = await req('GET', '/reports/assigned/me', { token: emmanuel.token });
check('report in collector assigned list', assigned.data.some((r) => r._id === rep.data._id));
check('admin cannot use collector endpoint', (await req('GET', '/reports/assigned/me', { token: admin.token })).status === 403);

const re = await req('PATCH', `/reports/${rep.data._id}/assign`, { token: admin.token, body: { collectorId: francis.user._id } });
const eNotes = (await req('GET', '/notifications', { token: emmanuel.token })).data;
const fNotes = (await req('GET', '/notifications', { token: francis.token })).data;
check('reassign notifies both collectors', re.status === 200 && eNotes.notifications[0].type === 'report_unassigned' && fNotes.notifications[0].type === 'report_assigned');
// Closing goes through a proof photo the admin approves (details in proof-test.mjs)
const PHOTO = 'data:image/jpeg;base64,' + 'A'.repeat(2000);
const proofBody = { photo: PHOTO, lat: 4.1553, lng: 9.2985 };
check('previous collector cannot close it', (await req('POST', `/reports/${rep.data._id}/proof`, { token: emmanuel.token, body: proofBody })).status === 403);
const proofSent = await req('POST', `/reports/${rep.data._id}/proof`, { token: francis.token, body: proofBody });
check('assigned collector sends proof', proofSent.status === 200 && proofSent.data.status === 'awaiting_review');
const approved = await req('PATCH', `/reports/${rep.data._id}/review`, { token: admin.token, body: { decision: 'approve' } });
check('admin approval marks collected', approved.status === 200 && approved.data.status === 'collected' && approved.data.collectedAt);
check('resident sees collected status', (await req('GET', '/reports/mine', { device })).data.find((r) => r._id === rep.data._id).status === 'collected');
check('collected report cannot be reassigned', (await req('PATCH', `/reports/${rep.data._id}/assign`, { token: admin.token, body: { collectorId: emmanuel.user._id } })).status === 400);
await req('PUT', '/notifications/read-all', { token: emmanuel.token });
check('mark all read', (await req('GET', '/notifications', { token: emmanuel.token })).data.unread === 0);

// --- Admin reset device
check('non-admin cannot reset device', (await req('PUT', `/community/users/${residentPhone}/reset-device`, { device })).status === 401);
const reset = await req('PUT', `/community/users/${residentPhone}/reset-device`, { token: admin.token });
check('admin resets device link', reset.status === 200);
check('old device token stops working', (await req('GET', '/community/chat', { device })).status === 401);
const moved = await req('POST', '/community/auth', { body: { phone: residentPhone } });
check('number can be registered on a new phone after reset', moved.status === 200 && moved.data.deviceToken && moved.data.deviceToken !== device);

// --- Applications → collector account
const appPhone = `655${suffix}`;
const appEmail = `applicant${suffix}@example.com`;
check('application without email refused', (await req('POST', '/applications', { body: { name: 'New Applicant', phone: appPhone, zone: 'Bonduma' } })).status === 400);
const app = await req('POST', '/applications', { body: { name: 'New Applicant', phone: appPhone, email: appEmail, zone: 'Bonduma' } });
check('application stored with normalized phone', app.status === 201 && app.data.phone === `+237${appPhone}`);
check('status lookup works with any format', (await req('GET', `/applications/status/237${appPhone}`)).data.status === 'pending');
const mk = await req('POST', `/applications/${app.data._id}/create-collector`, { token: admin.token, body: {} });
check('approve creates collector + returns temp password once', mk.status === 201 && typeof mk.data.temporaryPassword === 'string' && mk.data.application.status === 'approved');
const newLogin = await req('POST', '/auth/collector-login', { body: { email: appEmail, password: mk.data.temporaryPassword } });
check('new collector signs in with that password, must change it', newLogin.status === 200 && newLogin.data.user.mustChangePassword === true);
check('cannot create a second account', (await req('POST', `/applications/${app.data._id}/create-collector`, { token: admin.token, body: {} })).status === 400);

// --- Collector update normalizes phone, ignores credential fields
const upd = await req('PUT', `/collectors/${newLogin.data.user._id}`, { token: admin.token, body: { pin: '654321', password: 'hijack123', phone: `+237 ${appPhone}` } });
check('admin update: credentials hidden, phone normalized', upd.status === 200 && !('pin' in upd.data) && !('password' in upd.data) && upd.data.phone === `+237${appPhone}`);
check('password not changeable via update', (await req('POST', '/auth/collector-login', { body: { email: appEmail, password: 'hijack123' } })).status === 401);
await req('DELETE', `/collectors/${newLogin.data.user._id}`, { token: admin.token });

done();
