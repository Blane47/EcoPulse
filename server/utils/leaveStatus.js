const LeaveRequest = require('../models/LeaveRequest');
const Collector = require('../models/Collector');
const { today } = require('./dates');

// Moves collectors on and off leave to match their approved leave. Runs on startup,
// every few minutes, and straight after an admin approves or ends a leave.
// Only touches collectors whose status is what the leave would expect: an admin who
// deactivates someone, or puts them back on duty early, isn't overridden.
async function applyLeaveStatuses(collectorId) {
  const day = today();
  const scope = collectorId ? { collector: collectorId } : {};

  const starting = await LeaveRequest.find({
    ...scope, status: 'approved', startedAt: null, startDate: { $lte: day }, endDate: { $gte: day },
  });
  for (const leave of starting) {
    await Collector.updateOne({ _id: leave.collector, status: 'active' }, { status: 'on-leave' });
    leave.startedAt = new Date();
    await leave.save();
  }

  // Finished leave (including any that ran entirely while the server was down)
  const finished = await LeaveRequest.find({ ...scope, status: 'approved', endedAt: null, endDate: { $lt: day } });
  for (const leave of finished) {
    if (leave.startedAt) await endLeaveStatus(leave.collector, leave._id);
    leave.endedAt = new Date();
    await leave.save();
  }
}

// Back on duty, unless another approved leave covers today
async function endLeaveStatus(collectorId, exceptLeaveId) {
  const day = today();
  const stillOff = await LeaveRequest.exists({
    collector: collectorId, _id: { $ne: exceptLeaveId }, status: 'approved', startDate: { $lte: day }, endDate: { $gte: day },
  });
  if (!stillOff) await Collector.updateOne({ _id: collectorId, status: 'on-leave' }, { status: 'active' });
}

function startLeaveScheduler(intervalMs = 10 * 60 * 1000) {
  const run = () => applyLeaveStatuses().catch((err) => console.error('Leave status update failed:', err.message));
  run();
  setInterval(run, intervalMs).unref();
}

module.exports = { applyLeaveStatuses, endLeaveStatus, startLeaveScheduler };
