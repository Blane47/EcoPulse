const Collector = require('../models/Collector');
const Bin = require('../models/Bin');
const { normalizePhone } = require('../utils/phone');
const { normalizeEmail, isValidEmail } = require('../utils/email');
const { tempPassword } = require('../utils/tempPassword');

exports.getAllCollectors = async (req, res, next) => {
  try {
    const { zone, status } = req.query;
    const filter = {};

    if (zone) filter.zone = zone;
    if (status) filter.status = status;

    const collectors = await Collector.find(filter).sort({ name: 1 });
    res.json(collectors);
  } catch (error) {
    next(error);
  }
};

exports.getCollectorById = async (req, res, next) => {
  try {
    const collector = await Collector.findById(req.params.id);
    if (!collector) return res.status(404).json({ message: 'Collector not found' });
    res.json(collector);
  } catch (error) {
    next(error);
  }
};

// Fields an admin may set on a collector; credentials go through the dedicated paths below
const EDITABLE = ['name', 'email', 'phone', 'truck', 'zone', 'role', 'status', 'avatar', 'binsAssigned'];
const pick = (body) => Object.fromEntries(EDITABLE.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]));

const duplicateMessage = (error) =>
  error.keyPattern?.email ? 'A collector with this email already exists' : 'A collector with this phone number already exists';

// Admin adds a collector. They sign in with their email and a temporary password,
// returned once here, which the Collector app makes them change.
exports.createCollector = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });

    const temporaryPassword = tempPassword();
    const collector = await Collector.create({ ...pick(req.body), email, password: temporaryPassword, mustChangePassword: true });
    res.status(201).json({ collector, temporaryPassword });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: duplicateMessage(error) });
    next(error);
  }
};

exports.updateCollector = async (req, res, next) => {
  try {
    // findByIdAndUpdate skips document hooks, so normalise here
    const updates = pick(req.body);
    if (updates.phone !== undefined && updates.phone !== '') {
      const phone = normalizePhone(updates.phone);
      if (!phone) return res.status(400).json({ message: 'Enter a valid phone number' });
      updates.phone = phone;
    }
    if (updates.email !== undefined) {
      updates.email = normalizeEmail(updates.email);
      if (!isValidEmail(updates.email)) return res.status(400).json({ message: 'Enter a valid email address' });
    }

    const collector = await Collector.findByIdAndUpdate(req.params.id, updates, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!collector) return res.status(404).json({ message: 'Collector not found' });
    res.json(collector);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: duplicateMessage(error) });
    next(error);
  }
};

// Admin issues a new temporary password (forgotten password, or first sign-in for a
// collector who never had one). Returned once; the app makes the collector change it.
exports.resetCollectorPassword = async (req, res, next) => {
  try {
    const collector = await Collector.findById(req.params.id);
    if (!collector) return res.status(404).json({ message: 'Collector not found' });
    if (!collector.email) {
      return res.status(400).json({ message: 'Add an email for this collector first — it is how they sign in' });
    }
    const temporaryPassword = tempPassword();
    collector.password = temporaryPassword;
    collector.mustChangePassword = true;
    await collector.save();
    res.json({ email: collector.email, temporaryPassword });
  } catch (error) {
    next(error);
  }
};

exports.getMyRoute = async (req, res, next) => {
  try {
    const collectorId = req.user._id;
    const bins = await Bin.find({ assignedCollector: collectorId }).sort({ fillLevel: -1 });
    res.json({ bins });
  } catch (error) {
    next(error);
  }
};

exports.updateMyAvatar = async (req, res, next) => {
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ message: 'Avatar image is required' });

    const collector = await Collector.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true }
    );
    if (!collector) return res.status(404).json({ message: 'Collector not found' });

    res.json({ message: 'Avatar updated', avatar: collector.avatar });
  } catch (error) {
    next(error);
  }
};

exports.deleteCollector = async (req, res, next) => {
  try {
    const collector = await Collector.findByIdAndDelete(req.params.id);
    if (!collector) return res.status(404).json({ message: 'Collector not found' });
    res.json({ message: 'Collector deleted successfully' });
  } catch (error) {
    next(error);
  }
};
