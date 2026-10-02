const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  zone: { type: String, required: true },
  hasLicense: { type: Boolean, default: false },
  motivation: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
