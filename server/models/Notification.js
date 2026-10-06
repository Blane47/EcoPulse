const mongoose = require('mongoose');

// In-app notifications for collectors (e.g. "a report was assigned to you", "leave approved").
// The collector app polls for these; push delivery can be layered on later.
const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', required: true },
  type: { type: String, enum: ['report_assigned', 'report_unassigned', 'proof_approved', 'proof_rejected', 'leave_approved', 'leave_declined', 'leave_cancelled'], required: true },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  report: { type: mongoose.Schema.Types.ObjectId, ref: 'Report', default: null },
  read: { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
