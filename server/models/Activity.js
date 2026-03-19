const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  collector: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', required: true },
  bin: { type: mongoose.Schema.Types.ObjectId, ref: 'Bin', required: true },
  zone: { type: String, required: true },
  action: { type: String, enum: ['collected', 'reported', 'assigned'], default: 'collected' },
  status: { type: String, enum: ['completed', 'pending', 'failed'], default: 'completed' },
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
