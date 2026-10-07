// Proof-of-collection photos: who may submit, validation, admin review
import { req, check, done } from './helpers.mjs';
const PHOTO = 'data:image/jpeg;base64,' + 'A'.repeat(2000);

const admin = (await req('POST', '/auth/login', { body: { email: 'admin@ecopulse.cm', password: 'admin123' } })).data.token;
const emm = (await req('POST', '/auth/collector-login', { body: { email: 'emmanuel@ecopulse.cm', password: 'collector123' } })).data;
const fra = (await req('POST', '/auth/collector-login', { body: { email: 'francis@ecopulse.cm', password: 'collector123' } })).data;

// Resident files a report at a known spot
const phone = `677${String(Date.now()).slice(-6)}`;
const reg = await req('POST', '/community/auth', { body: { name: 'Proof Test Resident', phone, zone: 'Molyko' } });
const device = reg.data.deviceToken;
const spot = { lat: 4.1548, lng: 9.2985 };
const report = (await req('POST', '/reports', { device, body: { location: 'Proof test spot', zone: 'Molyko', coordinates: spot, photo: PHOTO } })).data;
await req('PATCH', `/reports/${report._id}/assign`, { token: admin, body: { collectorId: emm.user._id } });

check('old one-tap collect endpoint is gone', (await req('PATCH', `/reports/${report._id}/collected`, { token: emm.token })).status === 404);
check('other collector cannot submit proof', (await req('POST', `/reports/${report._id}/proof`, { token: fra.token, body: { photo: PHOTO, ...spot } })).status === 403);
check('admin cannot submit proof', (await req('POST', `/reports/${report._id}/proof`, { token: admin, body: { photo: PHOTO, ...spot } })).status === 403);
check('photo required', (await req('POST', `/reports/${report._id}/proof`, { token: emm.token, body: { ...spot } })).status === 400);
check('must be an image data URL', (await req('POST', `/reports/${report._id}/proof`, { token: emm.token, body: { photo: 'http://evil/x.png', ...spot } })).status === 400);
check('GPS required', (await req('POST', `/reports/${report._id}/proof`, { token: emm.token, body: { photo: PHOTO } })).status === 400);
check('oversized photo refused', (await req('POST', `/reports/${report._id}/proof`, { token: emm.token, body: { photo: 'data:image/jpeg;base64,' + 'A'.repeat(4.3 * 1024 * 1024), ...spot } })).status === 413);
check('admin cannot set awaiting_review directly', (await req('PATCH', `/reports/${report._id}`, { token: admin, body: { status: 'awaiting_review' } })).status === 400);
check('cannot review before a proof exists', (await req('PATCH', `/reports/${report._id}/review`, { token: admin, body: { decision: 'approve' } })).status === 400);

// ~55 m away from the reported spot
let r = await req('POST', `/reports/${report._id}/proof`, { token: emm.token, body: { photo: PHOTO, lat: 4.1553, lng: 9.2985 } });
check('collector submits proof', r.status === 200 && r.data.status === 'awaiting_review' && r.data.proof.photo === PHOTO, `distance=${r.data.proof?.distanceMeters}m`);
check('distance computed', r.data.proof.distanceMeters > 40 && r.data.proof.distanceMeters < 70);
check('cannot submit twice while waiting', (await req('POST', `/reports/${report._id}/proof`, { token: emm.token, body: { photo: PHOTO, ...spot } })).status === 400);

let mine = (await req('GET', '/reports/mine', { device })).data.find((x) => x._id === report._id);
check('resident sees awaiting_review', mine.status === 'awaiting_review');
check('resident cannot see proof photo before approval', !mine.proof?.photo);
check('resident never sees collector GPS / review / assignee', mine.proof?.lat === undefined && mine.review === undefined && mine.assignedCollector === undefined);

const listed = (await req('GET', '/reports', { token: admin })).data.find((x) => x._id === report._id);
check('admin list includes proof', listed.status === 'awaiting_review' && listed.proof.photo === PHOTO && listed.proof.distanceMeters != null);

check('reject needs a reason', (await req('PATCH', `/reports/${report._id}/review`, { token: admin, body: { decision: 'reject' } })).status === 400);
check('collector cannot review', (await req('PATCH', `/reports/${report._id}/review`, { token: emm.token, body: { decision: 'approve' } })).status === 403);
r = await req('PATCH', `/reports/${report._id}/review`, { token: admin, body: { decision: 'reject', note: 'Rubbish still beside the bin' } });
check('admin rejects', r.status === 200 && r.data.status === 'assigned' && r.data.review.decision === 'rejected');
let notes = (await req('GET', '/notifications', { token: emm.token })).data.notifications;
check('collector notified of rejection with reason', notes[0].type === 'proof_rejected' && notes[0].body.includes('Rubbish still beside the bin') && notes[0].report === report._id);
const assignedView = (await req('GET', '/reports/assigned/me', { token: emm.token })).data.find((x) => x._id === report._id);
check('collector sees rejection note on the report', assignedView.status === 'assigned' && assignedView.review.note === 'Rubbish still beside the bin');

r = await req('POST', `/reports/${report._id}/proof`, { token: emm.token, body: { photo: PHOTO + 'B', ...spot } });
check('collector resubmits', r.status === 200 && r.data.status === 'awaiting_review' && r.data.review?.decision == null, `distance=${r.data.proof.distanceMeters}m`);
r = await req('PATCH', `/reports/${report._id}/review`, { token: admin, body: { decision: 'approve' } });
check('admin approves', r.status === 200 && r.data.status === 'collected' && r.data.collectedAt && r.data.review.decision === 'approved');
notes = (await req('GET', '/notifications', { token: emm.token })).data.notifications;
check('collector notified of approval', notes[0].type === 'proof_approved');
mine = (await req('GET', '/reports/mine', { device })).data.find((x) => x._id === report._id);
check('resident sees collected + cleanup photo', mine.status === 'collected' && mine.proof.photo === PHOTO + 'B');
check('collected report cannot be reviewed again', (await req('PATCH', `/reports/${report._id}/review`, { token: admin, body: { decision: 'reject', note: 'again' } })).status === 400);

// Reassignment clears the previous collector's proof
const report2 = (await req('POST', '/reports', { device, body: { location: 'Proof test spot 2', zone: 'Molyko', coordinates: spot } })).data;
await req('PATCH', `/reports/${report2._id}/assign`, { token: admin, body: { collectorId: emm.user._id } });
await req('POST', `/reports/${report2._id}/proof`, { token: emm.token, body: { photo: PHOTO, ...spot } });
r = await req('PATCH', `/reports/${report2._id}/assign`, { token: admin, body: { collectorId: fra.user._id } });
check('reassigning clears old proof', r.data.status === 'assigned' && !r.data.proof?.photo && !r.data.review?.decision);

done();
