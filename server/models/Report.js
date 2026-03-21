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
  status: { type: String, enum: ['pending', 'reviewed', 'collected'], default: 'pending' },
  deviceId: { type: String, required: true },
  reporterName: { type: String, default: null },
  reporterPhone: { type: String, default: null },
  binId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bin', default: null },
}, { timestamps: true });

reportSchema.index({ deviceId: 1 });
reportSchema.index({ zone: 1, status: 1 });

module.exports = mongoose.model('Report', reportSchema);
