const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Collector = require('../models/Collector');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role });
    const token = generateToken(user._id);

    res.status(201).json({ user, token });
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

exports.collectorLogin = async (req, res, next) => {
  try {
    const { phone, pin } = req.body;
    if (!phone || !pin) {
      return res.status(400).json({ message: 'Please provide phone and PIN' });
    }

    const collector = await Collector.findOne({ phone });
    if (!collector || collector.pin !== pin) {
      return res.status(401).json({ message: 'Invalid phone or PIN' });
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
