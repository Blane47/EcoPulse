const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Collector = require('../models/Collector');
const { normalizeEmail } = require('../utils/email');
const { isCollector } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

exports.register = async (req, res, next) => {
  try {
    // Called by an admin to add a dashboard staff account (see routes/auth.js)
    const { name, password } = req.body;
    const email = req.body.email?.trim().toLowerCase();
    if (!name?.trim() || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Dashboard pages call admin-only endpoints, so staff accounts are admins
    const user = await User.create({ name: name.trim(), email, password, role: 'admin' });
    res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    res.json({ user, token });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res) => {
  res.json(req.user);
};

// Dashboard users (admins/staff) update their own name and email
exports.updateProfile = async (req, res, next) => {
  try {
    if (isCollector(req.user)) {
      return res.status(403).json({ message: 'Collector profiles are managed by an admin' });
    }
    const { name, email } = req.body;
    const updates = {};
    if (name?.trim()) updates.name = name.trim();
    if (email?.trim()) updates.email = email.trim().toLowerCase();

    const user = await User.findByIdAndUpdate(req.user._id, updates, { returnDocument: 'after', runValidators: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    // Collectors (incl. replacing a temporary password) and dashboard users share this endpoint
    const user = isCollector(req.user)
      ? await Collector.findById(req.user._id).select('+password')
      : await User.findById(req.user._id);
    if (!(await user.comparePassword(currentPassword))) {
      // 400, not 401: the dashboard treats any 401 as an expired session and signs the user out
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (newPassword === currentPassword) {
      return res.status(400).json({ message: 'Choose a password different from the current one' });
    }
    user.password = newPassword; // hashed by the model's pre-save hook
    if (isCollector(req.user)) user.mustChangePassword = false;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (error) {
    next(error);
  }
};

exports.collectorLogin = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const { password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter your email and password' });
    }

    const collector = await Collector.findOne({ email }).select('+password');
    // Same message whether the email or the password is wrong
    if (!collector || !(await collector.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (collector.status === 'inactive') {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact your supervisor.' });
    }

    const token = generateToken(collector._id);
    res.json({ user: collector, token });
  } catch (error) {
    next(error);
  }
};
