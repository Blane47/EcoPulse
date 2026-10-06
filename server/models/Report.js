const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  location: { type: String, required: true },
  coordinates: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  photo: { type: String, default: null },
  note: { type: String, default: '' },
  zone: { type: String, required: true },
  // pending → (reviewed) → assigned → awaiting_review (collector sent proof) → collected
  // A rejected proof sends the report back to assigned.
  status: { type: String, enum: ['pending', 'reviewed', 'assigned', 'awaiting_review', 'collected'], default: 'pending' },
  deviceId: { type: String, required: true },
  reporterName: { type: String, default: null },
  reporterPhone: { type: String, default: null },
  binId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bin', default: null },
  assignedCollector: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', default: null },
  assignedAt: { type: Date, default: null },
  collectedAt: { type: Date, default: null },
  // Proof of collection: the collector's photo of the cleared spot and where it was taken
  proof: {
    photo: { type: String, default: null },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    distanceMeters: { type: Number, default: null }, // from the reported spot, when it has coordinates
    submittedAt: { type: Date, default: null },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', default: null },
  },
  // Admin's latest decision on the proof
  review: {
    decision: { type: String, enum: ['approved', 'rejected', null], default: null },
    note: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
}, { timestamps: true });

reportSchema.index({ deviceId: 1 });
reportSchema.index({ zone: 1, status: 1 });
reportSchema.index({ assignedCollector: 1, status: 1 });

module.exports = mongoose.model('Report', reportSchema);
