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

// Status is derived from fill level. Updates that bypass save() (findByIdAndUpdate, insertMany)
// must call statusForFill themselves.
binSchema.statics.statusForFill = (fillLevel) => {
  if (fillLevel >= 80) return 'critical';
  if (fillLevel >= 50) return 'warning';
  if (fillLevel >= 20) return 'optimal';
  return 'empty';
};

binSchema.pre('save', function () {
  this.status = this.constructor.statusForFill(this.fillLevel);
});

module.exports = mongoose.model('Bin', binSchema);
