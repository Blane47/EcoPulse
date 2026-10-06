const mongoose = require('mongoose');

// A collector's request for time off. Dates are whole calendar days ('YYYY-MM-DD',
// Cameroon time), start and end both included. Once approved, utils/leaveStatus.js
// puts the collector on leave on the start date and back on duty after the end date.
const leaveRequestSchema = new mongoose.Schema({
  collector: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  status: { type: String, enum: ['pending', 'approved', 'declined', 'cancelled'], default: 'pending' },
  reviewNote: { type: String, default: '', trim: true, maxlength: 500 },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
  // Who cancelled it: the collector (before it started) or an admin (any time, ending it early)
  cancelledBy: { type: String, enum: ['collector', 'admin', null], default: null },
  // Set when the collector was put on leave / brought back, so each happens once
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
}, { timestamps: true });

leaveRequestSchema.index({ collector: 1, startDate: -1 });
leaveRequestSchema.index({ status: 1, startDate: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
