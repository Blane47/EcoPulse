const mongoose = require('mongoose');
const { normalizePhone } = require('../utils/phone');

const applicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  // Becomes the collector's sign-in email when the application is approved
  email: { type: String, lowercase: true, trim: true, default: '' },
  zone: { type: String, required: true },
  hasLicense: { type: Boolean, default: false },
  motivation: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  // Set when an approved application is turned into a collector account
  collector: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', default: null },
}, { timestamps: true });

applicationSchema.pre('validate', function () {
  if (!this.isModified('phone')) return;
  const phone = normalizePhone(this.phone);
  if (phone) this.phone = phone;
  else this.invalidate('phone', 'Enter a valid phone number');
});

module.exports = mongoose.model('Application', applicationSchema);
