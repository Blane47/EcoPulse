const jwt = require('jsonwebtoken');
const Operator = require('../models/Operator');
const Collector = require('../models/Collector');
const { normalizeEmail, isValidEmail } = require('../utils/email');
const { normalizePhone } = require('../utils/phone');

// Operator-admins sign in with email + password, like a Collector, but their token
// carries operatorId + a role claim so Phase 3 middleware can scope them to their own
// business. Mirrors authController.generateToken, with the extra claims.
const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// Fields a public caller (a resident browsing operators) may see — no credentials,
// no verification docs, no internal approval metadata.
const PUBLIC_FIELDS =
  'businessName logoUrl description zonesServed vehicleTypes vehicleCount baseFee commercialRate pricing loadSurcharge operatingHours acceptingRequests status rating reviewCount pickupsCompleted createdAt';

// Fields accepted at self-registration.
const REGISTER_FIELDS = [
  'businessName', 'ownerName', 'email', 'password', 'phone', 'zonesServed',
  'vehicleTypes', 'vehicleCount', 'baseFee', 'commercialRate', 'logoUrl',
  'licenseUrl', 'rccmNumber', 'description',
];

// Fields an operator may change on their own profile. Credentials, status and the
// rating aggregates are deliberately excluded.
const EDITABLE = [
  'businessName', 'ownerName', 'phone', 'logoUrl', 'description', 'zonesServed',
  'vehicleTypes', 'vehicleCount', 'baseFee', 'commercialRate', 'pricing',
  'loadSurcharge', 'operatingHours', 'licenseUrl', 'rccmNumber', 'acceptingRequests',
];

const pick = (body, keys) =>
  Object.fromEntries(keys.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

const duplicateMessage = (error) =>
  error.keyPattern?.email ? 'An operator with this email already exists' : 'An operator with this phone number already exists';

// POST /register — public self-registration. Starts life 'pending' until a
// super-admin approves it; the model hashes the password on save.
exports.registerOperator = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (!req.body.password) return res.status(400).json({ message: 'Password is required' });
    if (!req.body.businessName?.trim() || !req.body.ownerName?.trim()) {
      return res.status(400).json({ message: 'Business name and owner name are required' });
    }

    const operator = await Operator.create({
      ...pick(req.body, REGISTER_FIELDS),
      email,
      status: 'pending',
    });
    res.status(201).json(operator);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: duplicateMessage(error) });
    next(error);
  }
};

// POST /login — operator-admin login. Same technique as authController.login, but the
// token payload adds operatorId and a role of 'operator-admin'.
exports.loginOperator = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter your email and password' });
    }

    const operator = await Operator.findOne({ email }).select('+password');
    // Same message whether the email or the password is wrong
    if (!operator || !(await operator.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (operator.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Contact the municipal council.' });
    }

    const token = generateToken({ id: operator._id, operatorId: operator._id, role: 'operator-admin' });
    res.json({ operator, token });
  } catch (error) {
    next(error);
  }
};

// GET /available?zone= — PUBLIC. Operators a resident may request right now:
// approved, accepting requests, and serving the given zone. Public-safe fields only.
exports.getAvailableOperators = async (req, res, next) => {
  try {
    const { zone } = req.query;
    if (!zone) return res.status(400).json({ message: 'A zone is required' });

    const operators = await Operator.find({
      status: 'approved',
      acceptingRequests: true,
      zonesServed: zone,
    })
      .select(PUBLIC_FIELDS)
      .sort({ rating: -1, reviewCount: -1 });
    res.json(operators);
  } catch (error) {
    next(error);
  }
};

// GET /:id — operator detail, public-safe fields only.
exports.getOperatorById = async (req, res, next) => {
  try {
    const operator = await Operator.findById(req.params.id).select(PUBLIC_FIELDS);
    if (!operator) return res.status(404).json({ message: 'Operator not found' });
    res.json(operator);
  } catch (error) {
    next(error);
  }
};

// GET /me — the signed-in operator's own full profile (operatorAuth loaded it).
exports.getMe = async (req, res) => {
  res.json(req.operator);
};

// GET /me/collectors — the operator's own workers, to assign to pickup jobs.
exports.getMyCollectors = async (req, res, next) => {
  try {
    const collectors = await Collector.find({ operatorId: req.operator._id }).sort({ name: 1 });
    res.json(collectors);
  } catch (error) {
    next(error);
  }
};

// GET / — list all operators, optional ?status= filter (super-admin page).
// Gated by requireSuperAdmin in routes/operators.js.
exports.getAllOperators = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const operators = await Operator.find(filter).sort({ createdAt: -1 });
    res.json(operators);
  } catch (error) {
    next(error);
  }
};

// Shared helper for the super-admin lifecycle transitions. `extra` may be a plain
// object or a function of req (so approve can stamp approvedBy from the admin's token).
// All three are gated by requireSuperAdmin in routes/operators.js.
const setStatus = (status, extra = {}) => async (req, res, next) => {
  try {
    const fields = typeof extra === 'function' ? extra(req) : extra;
    const operator = await Operator.findByIdAndUpdate(
      req.params.id,
      { status, ...fields },
      { returnDocument: 'after', runValidators: true },
    );
    if (!operator) return res.status(404).json({ message: 'Operator not found' });
    res.json(operator);
  } catch (error) {
    next(error);
  }
};

// PATCH /:id/approve — super-admin only. Stamps who approved and when.
exports.approveOperator = setStatus('approved', (req) => ({ approvedAt: new Date(), approvedBy: req.user._id }));

// PATCH /:id/reject — super-admin only. Turns down an application; approval metadata cleared.
exports.rejectOperator = setStatus('rejected', { approvedAt: null, approvedBy: null });

// PATCH /:id/suspend — super-admin only. Stops a once-approved operator.
exports.suspendOperator = setStatus('suspended');

// PATCH /:id — operator updates their own profile/pricing/zones/hours/acceptingRequests.
// operatorAuth has loaded req.operator; an operator may only edit itself.
exports.updateOperator = async (req, res, next) => {
  try {
    if (!req.operator._id.equals(req.params.id)) {
      return res.status(403).json({ message: 'You can only update your own operator account' });
    }
    const updates = pick(req.body, EDITABLE);
    // findByIdAndUpdate skips document hooks, so normalise phone here like collectors do
    if (updates.phone === null || (typeof updates.phone === 'string' && !updates.phone.trim())) {
      delete updates.phone;
      updates.$unset = { phone: 1 };
    } else if (updates.phone !== undefined) {
      const phone = normalizePhone(updates.phone);
      if (!phone) return res.status(400).json({ message: 'Enter a valid phone number' });
      updates.phone = phone;
    }

    const operator = await Operator.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!operator) return res.status(404).json({ message: 'Operator not found' });
    res.json(operator);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: duplicateMessage(error) });
    next(error);
  }
};
