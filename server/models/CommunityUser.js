const mongoose = require('mongoose');

const communityUserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  zone: { type: String, required: true },
  reportsCount: { type: Number, default: 0 },
}, { timestamps: true });

communityUserSchema.index({ phone: 1 }, { unique: true });

module.exports = mongoose.model('CommunityUser', communityUserSchema);
