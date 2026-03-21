const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  zone: { type: String, required: true, enum: ['Molyko', 'Great Soppo', 'Bonduma', 'Buea Town'] },
  day: { type: String, required: true },
  time: { type: String, required: true },
  wasteTypes: [{ type: String, enum: ['General', 'Organic', 'Recyclable'] }],
  nextCollection: { type: Date },
}, { timestamps: true });

scheduleSchema.index({ zone: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
