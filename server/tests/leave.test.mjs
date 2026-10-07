// Leave requests API + the on/off-leave status job (dates moved in the DB to simulate time passing)
import { createRequire } from 'node:module';
import { req, check, done, MONGODB_URI } from './helpers.mjs';

const require = createRequire(import.meta.url);
const mongoose = require('mongoose');
const LeaveRequest = require('../models/LeaveRequest');
const Collector = require('../models/Collector');
const Notification = require('../models/Notification');
const { applyLeaveStatuses } = require('../utils/leaveStatus');
const { today, addDays } = require('../utils/dates');

await mongoose.connect(MONGODB_URI);
const tag = String(Date.now()).slice(-6);
const admin = (await req('POST', '/auth/login', { body: { email: 'admin@ecopulse.cm', password: 'admin123' } })).data.token;
const created = [];
const makeCollector = async (name) => {
  const email = `leave.${name.toLowerCase()}${tag}@example.com`;
  const r = await req('POST', '/collectors', { token: admin, body: { name: `Test Leave ${name}`, email, zone: 'Molyko' } });
  created.push(r.data.collector._id);
  const login = await req('POST', '/auth/collector-login', { body: { email, password: r.data.temporaryPassword } });
  return { id: r.data.collector._id, token: login.data.token };
};
const a = await makeCollector('Alpha');
const b = await makeCollector('Bravo');
const day = today();
const d = (n) => addDays(day, n);
const statusOf = async (id) => (await Collector.findById(id)).status;

// --- Asking for leave
check('needs a token', (await req('POST', '/leave', { body: {} })).status === 401);
check('admins cannot request leave', (await req('POST', '/leave', { token: admin, body: { startDate: d(1), endDate: d(2), reason: 'x y z' } })).status === 403);
const bad = async (body) => (await req('POST', '/leave', { token: a.token, body })).status;
check('invalid date refused', await bad({ startDate: '2026-02-30', endDate: d(2), reason: 'Family' }) === 400);
check('past start refused', await bad({ startDate: d(-1), endDate: d(2), reason: 'Family' }) === 400);
check('end before start refused', await bad({ startDate: d(3), endDate: d(2), reason: 'Family' }) === 400);
check('over 60 days refused', await bad({ startDate: d(1), endDate: d(61), reason: 'Family' }) === 400);
check('60 days allowed boundary ok', await bad({ startDate: d(100), endDate: d(159), reason: 'Long leave' }) === 201);
check('more than a year ahead refused', await bad({ startDate: d(400), endDate: d(401), reason: 'Family' }) === 400);
check('reason required', await bad({ startDate: d(1), endDate: d(2), reason: '  ' }) === 400);
let r = await req('POST', '/leave', { token: a.token, body: { startDate: d(5), endDate: d(7), reason: '  Family visit  ', status: 'approved', collector: b.id } });
check('request created as pending for the caller', r.status === 201 && r.data.status === 'pending' && r.data.collector === a.id && r.data.reason === 'Family visit');
const upcoming = r.data;
check('overlap with own request refused', (await req('POST', '/leave', { token: a.token, body: { startDate: d(7), endDate: d(9), reason: 'More' } })).status === 409);
check('other collector may book same days', (await req('POST', '/leave', { token: b.token, body: { startDate: d(5), endDate: d(6), reason: 'Sick' } })).status === 201);

r = await req('GET', '/leave/mine', { token: a.token });
check('mine lists only own requests, with today', r.status === 200 && r.data.today === day && r.data.leaves.every((l) => l.collector === a.id) && r.data.leaves.length === 2);
check('collector cannot list everyone', (await req('GET', '/leave', { token: a.token })).status === 403);

// --- Admin review
r = await req('GET', '/leave?status=pending', { token: admin });
check('admin list populates collector', r.status === 200 && r.data.leaves.some((l) => l._id === upcoming._id && l.collector.name === 'Test Leave Alpha'));
check('admin filter by collector', (await req('GET', `/leave?collector=${b.id}`, { token: admin })).data.leaves.every((l) => l.collector._id === b.id));
check('bad collector filter is 400', (await req('GET', '/leave?collector=nope', { token: admin })).status === 400);
check('bad decision refused', (await req('PATCH', `/leave/${upcoming._id}/review`, { token: admin, body: { decision: 'maybe' } })).status === 400);
check('collector cannot review', (await req('PATCH', `/leave/${upcoming._id}/review`, { token: a.token, body: { decision: 'approve' } })).status === 403);
r = await req('PATCH', `/leave/${upcoming._id}/review`, { token: admin, body: { decision: 'approve', note: 'Enjoy' } });
check('approve upcoming', r.status === 200 && r.data.status === 'approved' && r.data.reviewedBy?.name && r.data.reviewNote === 'Enjoy');
check('upcoming approval leaves collector active', await statusOf(a.id) === 'active');
check('cannot review twice', (await req('PATCH', `/leave/${upcoming._id}/review`, { token: admin, body: { decision: 'decline' } })).status === 400);
let notes = (await req('GET', '/notifications', { token: a.token })).data.notifications;
check('collector notified of approval', notes[0]?.type === 'leave_approved' && notes[0].report === null && notes[0].body.includes('Enjoy'));

// Collector cancels approved leave before it starts
r = await req('PATCH', `/leave/${upcoming._id}/cancel`, { token: b.token });
check('other collector cannot cancel it', r.status === 404);
r = await req('PATCH', `/leave/${upcoming._id}/cancel`, { token: a.token });
check('collector cancels approved upcoming leave', r.status === 200 && r.data.status === 'cancelled' && r.data.cancelledBy === 'collector' && r.data.cancelledAt);
check('cancel twice refused', (await req('PATCH', `/leave/${upcoming._id}/cancel`, { token: a.token })).status === 400);

// Leave starting today puts the collector on leave at once
r = await req('POST', '/leave', { token: a.token, body: { startDate: day, endDate: d(2), reason: 'Sick' } });
const current = r.data;
r = await req('PATCH', `/leave/${current._id}/review`, { token: admin, body: { decision: 'approve' } });
check('approving leave covering today sets on-leave', r.status === 200 && await statusOf(a.id) === 'on-leave');
notes = (await req('GET', '/notifications', { token: a.token })).data.notifications;
check('approval of leave starting today sends no extra "started" notice', notes[0]?.type === 'leave_approved' && !notes.some((n) => n.type === 'leave_started'));
check('started leave cannot be cancelled by collector', (await req('PATCH', `/leave/${current._id}/cancel`, { token: a.token })).status === 400);
r = await req('PATCH', `/leave/${current._id}/end`, { token: admin, body: { note: 'Needed back' } });
check('admin ends leave early → active', r.status === 200 && r.data.status === 'cancelled' && r.data.cancelledBy === 'admin' && await statusOf(a.id) === 'active');
notes = (await req('GET', '/notifications', { token: a.token })).data.notifications;
check('collector told leave ended early', notes[0]?.type === 'leave_cancelled' && notes[0].title === 'Leave ended early');
check('cannot end twice', (await req('PATCH', `/leave/${current._id}/end`, { token: admin })).status === 400);
check('admin cancellation records who and when', r.data.cancelledByUser?.name && r.data.cancelledAt);
check('ending note kept apart from approval note', r.data.cancelNote === 'Needed back' && r.data.reviewNote === '');
// First day arrives before the job runs: ending it still counts as ending started leave
r = await req('POST', '/leave', { token: a.token, body: { startDate: d(10), endDate: d(12), reason: 'Exams' } });
const firstDay = r.data;
await req('PATCH', `/leave/${firstDay._id}/review`, { token: admin, body: { decision: 'approve' } });
await LeaveRequest.updateOne({ _id: firstDay._id }, { startDate: day });
r = await req('PATCH', `/leave/${firstDay._id}/end`, { token: admin });
check('ending on day one before the job ran treats it as started', r.status === 200 && r.data.startedAt && r.data.endedAt && await statusOf(a.id) === 'active');

// Decline
r = await req('POST', '/leave', { token: a.token, body: { startDate: d(20), endDate: d(20), reason: 'Wedding' } });
r = await req('PATCH', `/leave/${r.data._id}/review`, { token: admin, body: { decision: 'decline', note: 'Short-staffed' } });
check('decline', r.status === 200 && r.data.status === 'declined');
notes = (await req('GET', '/notifications', { token: a.token })).data.notifications;
check('collector notified of decline', notes[0]?.type === 'leave_declined');
check('declined days can be requested again', (await req('POST', '/leave', { token: a.token, body: { startDate: d(20), endDate: d(21), reason: 'Wedding' } })).status === 201);

// --- The status job (dates moved directly in the DB to simulate time passing)
r = await req('POST', '/leave', { token: b.token, body: { startDate: d(30), endDate: d(31), reason: 'Holiday' } });
const job = r.data;
await req('PATCH', `/leave/${job._id}/review`, { token: admin, body: { decision: 'approve' } });
check('future approved leave: still active', await statusOf(b.id) === 'active');
await LeaveRequest.updateOne({ _id: job._id }, { startDate: d(-1), endDate: d(1) });
await applyLeaveStatuses();
check('job starts leave once its first day arrives', await statusOf(b.id) === 'on-leave' && (await LeaveRequest.findById(job._id)).startedAt);
check('collector told leave started', (await Notification.findOne({ recipient: b.id }).sort({ createdAt: -1 })).type === 'leave_started');
await Collector.updateOne({ _id: b.id }, { status: 'active' }); // admin brings them back by hand
await applyLeaveStatuses();
check('job does not override an admin putting them back on duty', await statusOf(b.id) === 'active');
await Collector.updateOne({ _id: b.id }, { status: 'on-leave' });
await LeaveRequest.updateOne({ _id: job._id }, { startDate: d(-3), endDate: d(-1) });
await applyLeaveStatuses();
check('job brings collector back after the last day', await statusOf(b.id) === 'active' && (await LeaveRequest.findById(job._id)).endedAt);
check('collector told they are back on duty', (await Notification.findOne({ recipient: b.id }).sort({ createdAt: -1 })).type === 'leave_ended');
// Back-to-back leave: ending one while another covers today keeps them on leave
r = await req('POST', '/leave', { token: b.token, body: { startDate: d(40), endDate: d(41), reason: 'Part one' } });
const p1 = r.data;
r = await req('POST', '/leave', { token: b.token, body: { startDate: d(42), endDate: d(43), reason: 'Part two' } });
const p2 = r.data;
await req('PATCH', `/leave/${p1._id}/review`, { token: admin, body: { decision: 'approve' } });
await req('PATCH', `/leave/${p2._id}/review`, { token: admin, body: { decision: 'approve' } });
await LeaveRequest.updateOne({ _id: p1._id }, { startDate: d(-2), endDate: d(-1), startedAt: new Date() });
await LeaveRequest.updateOne({ _id: p2._id }, { startDate: day, endDate: d(1) });
await Collector.updateOne({ _id: b.id }, { status: 'on-leave' });
await applyLeaveStatuses();
check('back-to-back leave keeps collector on leave', await statusOf(b.id) === 'on-leave');
// Inactive collectors are never put on leave
await Collector.updateOne({ _id: b.id }, { status: 'inactive' });
await LeaveRequest.updateOne({ _id: p2._id }, { startedAt: null });
await applyLeaveStatuses();
check('inactive collector stays inactive', await statusOf(b.id) === 'inactive');
check('inactive collector cannot request leave', (await req('POST', '/leave', { token: b.token, body: { startDate: d(50), endDate: d(50), reason: 'Sick' } })).status === 403);
check('approving past dates refused', await (async () => {
  const x = await LeaveRequest.create({ collector: a.id, startDate: d(-5), endDate: d(-4), reason: 'Old' });
  return (await req('PATCH', `/leave/${x._id}/review`, { token: admin, body: { decision: 'approve' } })).status === 400;
})());

// Cleanup
await LeaveRequest.deleteMany({ collector: { $in: created } });
await Notification.deleteMany({ recipient: { $in: created } });
for (const id of created) await req('DELETE', `/collectors/${id}`, { token: admin });
await mongoose.disconnect();
done();
