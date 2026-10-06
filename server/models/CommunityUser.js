const mongoose = require('mongoose');
const { normalizePhone } = require('../utils/phone');

const communityUserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  zone: { type: String, required: true },
  reportsCount: { type: Number, default: 0 },
  // SHA-256 of the device token issued to the phone that registered this number
  deviceTokenHash: { type: String, default: null, select: false, index: true },
}, { timestamps: true });

communityUserSchema.pre('validate', function () {
  if (!this.isModified('phone')) return;
  const phone = normalizePhone(this.phone);
  if (phone) this.phone = phone;
  else this.invalidate('phone', 'Enter a valid phone number');
});

module.exports = mongoose.model('CommunityUser', communityUserSchema);
