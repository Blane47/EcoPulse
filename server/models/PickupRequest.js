const mongoose = require('mongoose');
const { WASTE_TYPES, LOAD_SIZES } = require('../utils/pricing');

// An on-demand pickup a resident requests from a private operator. Separate
// from Report (a flagged municipal bin): this is a paid, door-to-door job with
// its own lifecycle. Payment is simulated for now (cash on pickup).
const STATUSES = ['requested', 'accepted', 'en_route', 'picked_up', 'completed', 'cancelled', 'declined'];

const pickupRequestSchema = new mongoose.Schema({
  // Resident identity (device-token based, like the rest of the community app).
  resident: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityUser', default: null },
  residentName: { type: String, default: '', trim: true },
  phone: { type: String, default: '' },

  operator: { type: mongoose.Schema.Types.ObjectId, ref: 'Operator', required: true, index: true },
  collector: { type: mongoose.Schema.Types.ObjectId, ref: 'Collector', default: null },

  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String, default: '', trim: true },
    zone: { type: String, enum: ['Molyko', 'Great Soppo', 'Bonduma', 'Buea Town'] },
  },
  note: { type: String, default: '', trim: true },

  wasteType: { type: String, enum: WASTE_TYPES, default: 'household' },
  loadSize: { type: String, enum: LOAD_SIZES, default: 'medium' },

  // Server-computed from the operator's pricing at request time.
  fee: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['cash', 'momo'], default: 'cash' },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },

  status: { type: String, enum: STATUSES, default: 'requested', index: true },

  // Lifecycle timestamps
  requestedAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date, default: null },
  enRouteAt: { type: Date, default: null },
  pickedUpAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancelledBy: { type: String, enum: ['resident', 'operator', 'system', null], default: null },

  // Set after completion when the resident rates the collector/operator.
  rating: {
    stars: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, default: '', trim: true },
    tags: { type: [String], default: [] },
  },
}, {
  timestamps: true,
});

pickupRequestSchema.statics.STATUSES = STATUSES;

// Allowed status transitions, guarded in the controller.
pickupRequestSchema.statics.TRANSITIONS = {
  requested: ['accepted', 'declined', 'cancelled'],
  accepted: ['en_route', 'cancelled'],
  en_route: ['picked_up', 'cancelled'],
  picked_up: ['completed'],
  completed: [],
  cancelled: [],
  declined: [],
};

module.exports = mongoose.model('PickupRequest', pickupRequestSchema);
