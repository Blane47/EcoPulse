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
  // pending → (reviewed) → assigned → collected
  status: { type: String, enum: ['pending', 'reviewed', 'assigned', 'collected'], default: 'pending' },
  deviceId: { type: String, required: true },
  reporterName: { type: String, default: null },
  reporterPhone: { type: String, default: null },
  binId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bin', default: null },
  assignedCollector: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', default: null },
  assignedAt: { type: Date, default: null },
  collectedAt: { type: Date, default: null },
}, { timestamps: true });

reportSchema.index({ deviceId: 1 });
reportSchema.index({ zone: 1, status: 1 });
reportSchema.index({ assignedCollector: 1, status: 1 });

module.exports = mongoose.model('Report', reportSchema);
