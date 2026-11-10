const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { normalizePhone } = require('../utils/phone');
const { normalizeEmail, isValidEmail } = require('../utils/email');

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$/;

// The municipal zones a private operator may serve — same set as Collector.zone.
const ZONES = ['Molyko', 'Great Soppo', 'Bonduma', 'Buea Town'];
const VEHICLE_TYPES = ['pickup', 'tricycle', 'van'];

// A private, on-demand waste-collection business (e.g. "Trash Vallet") that
// self-registers on the EcoPulse platform. Distinct from HYSACAM municipal
// collection; approved by the super-admin (municipal council) before it can
// receive resident pickup requests.
const operatorSchema = new mongoose.Schema({
  businessName: { type: String, required: true, trim: true },
  ownerName: { type: String, required: true, trim: true },
  // Operator-admin signs in with email + password (like a Collector).
  email: { type: String, required: true, unique: true },
  password: { type: String, select: false },
  phone: { type: String, unique: true, sparse: true },

  logoUrl: { type: String, default: null },
  description: { type: String, default: '', trim: true },

  // Coverage + fleet
  zonesServed: { type: [{ type: String, enum: ZONES }], default: [] },
  vehicleTypes: { type: [{ type: String, enum: VEHICLE_TYPES }], default: [] },
  vehicleCount: { type: Number, default: 1, min: 0 },

  // Pricing (FCFA). baseFee = household baseline; commercialRate = bulky/commercial.
  // pricing overrides per waste type; loadSurcharge adds by load size.
  baseFee: { type: Number, default: 1500, min: 0 },
  commercialRate: { type: Number, default: 5000, min: 0 },
  pricing: {
    household: { type: Number, min: 0 },
    bulky: { type: Number, min: 0 },
    recyclables: { type: Number, min: 0 },
    garden: { type: Number, min: 0 },
  },
  loadSurcharge: {
    small: { type: Number, default: 0, min: 0 },
    medium: { type: Number, default: 500, min: 0 },
    large: { type: Number, default: 1500, min: 0 },
  },

  // Open hours drive whether on-demand requests arrive; empty = always open.
  operatingHours: {
    type: [{
      day: { type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
      open: { type: String, default: '07:00' },
      close: { type: String, default: '18:00' },
      active: { type: Boolean, default: true },
    }],
    default: [],
  },

  // Verification docs
  licenseUrl: { type: String, default: null },
  rccmNumber: { type: String, default: '', trim: true },

  // Lifecycle: self-register -> pending -> super-admin approves / rejects / suspends.
  // 'rejected' = application turned down (never approved); 'suspended' = a once-approved
  // operator stopped. Both are barred from receiving requests (createPickup needs 'approved').
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending' },
  acceptingRequests: { type: Boolean, default: true },
  approvedAt: { type: Date, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Aggregates maintained from completed pickups' ratings
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0, min: 0 },
  pickupsCompleted: { type: Number, default: 0, min: 0 },
}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.password;
      return ret;
    },
  },
});

operatorSchema.pre('validate', function () {
  if (typeof this.phone === 'string' && !this.phone.trim()) this.phone = undefined;
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

operatorSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password || BCRYPT_HASH.test(this.password)) return;
  this.password = await bcrypt.hash(this.password, 10);
});

operatorSchema.methods.comparePassword = function (candidate) {
  if (!this.password || !candidate) return false;
  return bcrypt.compare(String(candidate), this.password);
};

operatorSchema.statics.hashPassword = (password) => bcrypt.hash(String(password), 10);
operatorSchema.statics.ZONES = ZONES;
operatorSchema.statics.VEHICLE_TYPES = VEHICLE_TYPES;

module.exports = mongoose.model('Operator', operatorSchema);
