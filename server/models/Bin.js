const mongoose = require('mongoose');

const binSchema = new mongoose.Schema({
  binId: { type: String, required: true, unique: true },
  location: { type: String, required: true },
  zone: { type: String, required: true, enum: ['Molyko', 'Great Soppo', 'Bonduma', 'Buea Town'] },
  type: { type: String, required: true, enum: ['General', 'Recyclable', 'Organic'] },
  fillLevel: { type: Number, default: 0, min: 0, max: 100 },
  status: { type: String, enum: ['empty', 'optimal', 'warning', 'critical'], default: 'empty' },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  assignedCollector: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', default: null },
  lastCollected: { type: Date, default: null },
  photo: { type: String, default: null },
}, { timestamps: true });

binSchema.pre('save', function () {
  if (this.fillLevel >= 80) this.status = 'critical';
  else if (this.fillLevel >= 50) this.status = 'warning';
  else if (this.fillLevel >= 20) this.status = 'optimal';
  else this.status = 'empty';
});

module.exports = mongoose.model('Bin', binSchema);
