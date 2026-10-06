const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { normalizePhone } = require('../utils/phone');
const { normalizeEmail, isValidEmail } = require('../utils/email');

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;

const collectorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // Collectors sign in to the Collector app with email + password
  email: { type: String, unique: true, sparse: true },
  // bcrypt hash; never returned unless explicitly selected
  password: { type: String, select: false },
  // Set when an admin issues a temporary password; the app asks for a new one at sign-in
  mustChangePassword: { type: Boolean, default: false },
  // Legacy PIN hash from the old phone + PIN sign-in; never selected, removed by scripts/migrate.js
  pin: { type: String, select: false },
  phone: { type: String, unique: true, sparse: true },
  truck: { type: String, default: '' },
  zone: { type: String, required: true, enum: ['Molyko', 'Great Soppo', 'Bonduma', 'Buea Town'] },
  role: { type: String, enum: ['field_collector', 'zone_supervisor'], default: 'field_collector' },
  status: { type: String, enum: ['active', 'on-leave', 'inactive'], default: 'active' },
  avatar: { type: String, default: null },
  binsAssigned: { type: Number, default: 0 },
  collectionsToday: { type: Number, default: 0 },
  collectionsMonth: { type: Number, default: 0 },
  efficiency: { type: Number, default: 0, min: 0, max: 100 },
}, {
  timestamps: true,
  // Never send credentials in API responses
  toJSON: {
    transform(doc, ret) {
      delete ret.password;
      delete ret.pin;
      return ret;
    },
  },
});

collectorSchema.pre('validate', function () {
  if (this.isModified('phone') && this.phone) {
    const phone = normalizePhone(this.phone);
    if (phone) this.phone = phone;
    else this.invalidate('phone', 'Enter a valid phone number');
  }
  if (this.isModified('email') && this.email) {
    this.email = normalizeEmail(this.email);
    if (!isValidEmail(this.email)) this.invalidate('email', 'Enter a valid email address');
  }
});

collectorSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password || BCRYPT_HASH.test(this.password)) return;
  this.password = await bcrypt.hash(this.password, 10);
});

collectorSchema.methods.comparePassword = function (candidate) {
  if (!this.password || !candidate) return false;
  return bcrypt.compare(String(candidate), this.password);
};

collectorSchema.statics.hashPassword = (password) => bcrypt.hash(String(password), 10);

module.exports = mongoose.model('Collector', collectorSchema);
