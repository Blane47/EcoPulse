const mongoose = require('mongoose');

const collectorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, unique: true, sparse: true },
  pin: { type: String },
  truck: { type: String, default: '' },
  zone: { type: String, required: true, enum: ['Molyko', 'Great Soppo', 'Bonduma', 'Buea Town'] },
  role: { type: String, enum: ['field_collector', 'zone_supervisor'], default: 'field_collector' },
  status: { type: String, enum: ['active', 'on-leave', 'inactive'], default: 'active' },
  avatar: { type: String, default: null },
  binsAssigned: { type: Number, default: 0 },
  collectionsToday: { type: Number, default: 0 },
  collectionsMonth: { type: Number, default: 0 },
  efficiency: { type: Number, default: 0, min: 0, max: 100 },
}, { timestamps: true });

module.exports = mongoose.model('Collector', collectorSchema);
