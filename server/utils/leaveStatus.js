const LeaveRequest = require('../models/LeaveRequest');
const Collector = require('../models/Collector');
const Notification = require('../models/Notification');
const { today, formatRange } = require('./dates');

// Lets the app refresh its status (it only re-reads the profile when something arrives)
const tell = (leave, type, title) =>
  Notification.create({ recipient: leave.collector, type, title, body: formatRange(leave.startDate, leave.endDate) });

// Moves collectors on and off leave to match their approved leave. Runs on startup,
// every few minutes, and straight after an admin approves or ends a leave.
// Only touches collectors whose status is what the leave would expect: an admin who
// deactivates someone, or puts them back on duty early, isn't overridden.
// notify: false when the caller already told the collector (e.g. "Leave approved").
async function applyLeaveStatuses(collectorId, { notify = true } = {}) {
  const day = today();
  const scope = collectorId ? { collector: collectorId } : {};

  const starting = await LeaveRequest.find({
    ...scope, status: 'approved', startedAt: null, startDate: { $lte: day }, endDate: { $gte: day },
  });
  for (const leave of starting) {
    const { modifiedCount } = await Collector.updateOne({ _id: leave.collector, status: 'active' }, { status: 'on-leave' });
    leave.startedAt = new Date();
    await leave.save();
    if (modifiedCount && notify) await tell(leave, 'leave_started', 'Your leave has started');
  }

  // Finished leave (including any that ran entirely while the server was down)
  const finished = await LeaveRequest.find({ ...scope, status: 'approved', endedAt: null, endDate: { $lt: day } });
  for (const leave of finished) {
    const backOnDuty = leave.startedAt && await endLeaveStatus(leave.collector, leave._id);
    leave.endedAt = new Date();
    await leave.save();
    if (backOnDuty && notify) await tell(leave, 'leave_ended', 'You are back on duty');
  }
}

// Back on duty, unless another approved leave covers today; true if the status changed
async function endLeaveStatus(collectorId, exceptLeaveId) {
  const day = today();
  const stillOff = await LeaveRequest.exists({
    collector: collectorId, _id: { $ne: exceptLeaveId }, status: 'approved', startDate: { $lte: day }, endDate: { $gte: day },
  });
  if (stillOff) return false;
  const { modifiedCount } = await Collector.updateOne({ _id: collectorId, status: 'on-leave' }, { status: 'active' });
  return modifiedCount > 0;
}

function startLeaveScheduler(intervalMs = 10 * 60 * 1000) {
  const run = () => applyLeaveStatuses().catch((err) => console.error('Leave status update failed:', err.message));
  run();
  setInterval(run, intervalMs).unref();
}

module.exports = { applyLeaveStatuses, endLeaveStatus, startLeaveScheduler };
