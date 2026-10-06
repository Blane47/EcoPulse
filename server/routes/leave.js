const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const LeaveRequest = require('../models/LeaveRequest');
const Notification = require('../models/Notification');
const { protect, authorize, collectorOnly } = require('../middleware/auth');
const { today, isDay, daysInclusive, formatRange } = require('../utils/dates');
const { applyLeaveStatuses, endLeaveStatus } = require('../utils/leaveStatus');

const MAX_DAYS = 60;
// How far ahead leave can be booked
const MAX_DAYS_AHEAD = 365;

const COLLECTOR_FIELDS = 'name zone status avatar truck';

const overlapping = (collector, startDate, endDate, exceptId) => LeaveRequest.exists({
  collector,
  status: { $in: ['pending', 'approved'] },
  startDate: { $lte: endDate },
  endDate: { $gte: startDate },
  ...(exceptId ? { _id: { $ne: exceptId } } : {}),
});

const notify = (leave, type, title, extra = '') => Notification.create({
  recipient: leave.collector._id || leave.collector,
  type,
  title,
  body: [formatRange(leave.startDate, leave.endDate), extra].filter(Boolean).join(' — '),
});

const findLeave = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ message: 'Leave request not found' });
    return null;
  }
  const leave = await LeaveRequest.findById(req.params.id);
  if (!leave) res.status(404).json({ message: 'Leave request not found' });
  return leave;
};

// ---- Collector ----

// POST — collector asks for leave
router.post('/', protect, collectorOnly, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.body;
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    if (!isDay(startDate) || !isDay(endDate)) {
      return res.status(400).json({ message: 'Choose a start and end date' });
    }
    const day = today();
    if (startDate < day) return res.status(400).json({ message: 'Leave can’t start in the past' });
    if (endDate < startDate) return res.status(400).json({ message: 'The end date is before the start date' });
    if (daysInclusive(startDate, endDate) > MAX_DAYS) {
      return res.status(400).json({ message: `Leave can be at most ${MAX_DAYS} days; ask the admin about longer leave` });
    }
    if (daysInclusive(day, startDate) > MAX_DAYS_AHEAD) {
      return res.status(400).json({ message: 'Leave can be requested up to a year ahead' });
    }
    if (reason.length < 3) return res.status(400).json({ message: 'Give a short reason' });
    if (reason.length > 500) return res.status(400).json({ message: 'Keep the reason under 500 characters' });
    if (req.user.status === 'inactive') return res.status(403).json({ message: 'Your account is deactivated' });
    if (await overlapping(req.user._id, startDate, endDate)) {
      return res.status(409).json({ message: 'You already have a leave request covering some of these days' });
    }

    const leave = await LeaveRequest.create({ collector: req.user._id, startDate, endDate, reason });
    res.status(201).json(leave);
  } catch (error) {
    next(error);
  }
});

// GET — the signed-in collector's requests, newest dates first
router.get('/mine', protect, collectorOnly, async (req, res, next) => {
  try {
    const leaves = await LeaveRequest.find({ collector: req.user._id }).sort({ startDate: -1, createdAt: -1 }).limit(50);
    res.json({ leaves, today: today() });
  } catch (error) {
    next(error);
  }
});

// PATCH — collector withdraws a request that hasn't started yet
router.patch('/:id/cancel', protect, collectorOnly, async (req, res, next) => {
  try {
    const leave = await findLeave(req, res);
    if (!leave) return;
    if (!leave.collector.equals(req.user._id)) return res.status(404).json({ message: 'Leave request not found' });
    const upcoming = leave.status === 'pending' || (leave.status === 'approved' && leave.startDate > today());
    if (!upcoming) {
      return res.status(400).json({ message: leave.status === 'approved' ? 'This leave has started; ask the admin to end it' : 'This request is already closed' });
    }
    leave.status = 'cancelled';
    leave.cancelledBy = 'collector';
    await leave.save();
    res.json(leave);
  } catch (error) {
    next(error);
  }
});

// ---- Admin ----

// GET — all requests (optionally ?status= and/or ?collector=), soonest first within each status
router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const filter = {};
    if (['pending', 'approved', 'declined', 'cancelled'].includes(req.query.status)) filter.status = req.query.status;
    if (req.query.collector !== undefined) {
      if (!mongoose.isValidObjectId(req.query.collector)) return res.status(400).json({ message: 'Invalid collector id' });
      filter.collector = req.query.collector;
    }
    const leaves = await LeaveRequest.find(filter)
      .populate('collector', COLLECTOR_FIELDS)
      .populate('reviewedBy', 'name')
      .sort({ startDate: -1, createdAt: -1 })
      .limit(500);
    res.json({ leaves, today: today() });
  } catch (error) {
    next(error);
  }
});

// PATCH — approve or decline a pending request
router.patch('/:id/review', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { decision } = req.body;
    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
    if (!['approve', 'decline'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be approve or decline' });
    }
    const leave = await findLeave(req, res);
    if (!leave) return;
    if (leave.status !== 'pending') return res.status(400).json({ message: 'This request has already been dealt with' });
    if (decision === 'approve' && leave.endDate < today()) {
      return res.status(400).json({ message: 'These dates have passed; decline the request instead' });
    }

    leave.status = decision === 'approve' ? 'approved' : 'declined';
    leave.reviewNote = note;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    await leave.save();

    if (decision === 'approve') {
      await notify(leave, 'leave_approved', 'Leave approved', note);
      await applyLeaveStatuses(leave.collector);
    } else {
      await notify(leave, 'leave_declined', 'Leave declined', note);
    }

    await leave.populate([{ path: 'collector', select: COLLECTOR_FIELDS }, { path: 'reviewedBy', select: 'name' }]);
    res.json(leave);
  } catch (error) {
    next(error);
  }
});

// PATCH — admin cancels approved leave before it starts, or ends it early
router.patch('/:id/end', protect, authorize('admin'), async (req, res, next) => {
  try {
    const note = typeof req.body.note === 'string' ? req.body.note.trim().slice(0, 500) : '';
    const leave = await findLeave(req, res);
    if (!leave) return;
    if (leave.status !== 'approved' || leave.endedAt) {
      return res.status(400).json({ message: 'Only approved leave that hasn’t finished can be ended' });
    }

    const started = !!leave.startedAt;
    leave.status = 'cancelled';
    leave.cancelledBy = 'admin';
    if (note) leave.reviewNote = note;
    if (started) leave.endedAt = new Date();
    await leave.save();
    if (started) await endLeaveStatus(leave.collector, leave._id);

    await notify(leave, 'leave_cancelled', started ? 'Leave ended early' : 'Leave cancelled', note);
    await leave.populate([{ path: 'collector', select: COLLECTOR_FIELDS }, { path: 'reviewedBy', select: 'name' }]);
    res.json(leave);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
