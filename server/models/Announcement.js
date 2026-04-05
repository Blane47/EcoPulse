const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  zone: { type: String, default: 'all' }, // 'all' or specific zone name
  type: { type: String, enum: ['info', 'warning', 'urgent'], default: 'info' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
