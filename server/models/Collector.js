const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { normalizePhone } = require('../utils/phone');

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;

const collectorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, unique: true, sparse: true },
  // bcrypt hash of the 6-digit login PIN; never returned unless explicitly selected
  pin: { type: String, select: false },
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

collectorSchema.pre('validate', function () {
  if (!this.isModified('phone') || !this.phone) return;
  const phone = normalizePhone(this.phone);
  if (phone) this.phone = phone;
  else this.invalidate('phone', 'Enter a valid phone number');
});

collectorSchema.pre('save', async function () {
  if (!this.isModified('pin') || !this.pin || BCRYPT_HASH.test(this.pin)) return;
  this.pin = await bcrypt.hash(this.pin, 10);
});

collectorSchema.methods.comparePin = function (candidate) {
  if (!this.pin || !candidate) return false;
  return bcrypt.compare(String(candidate), this.pin);
};

collectorSchema.statics.hashPin = (pin) => bcrypt.hash(String(pin), 10);
collectorSchema.statics.isHashedPin = (pin) => BCRYPT_HASH.test(pin || '');

module.exports = mongoose.model('Collector', collectorSchema);
