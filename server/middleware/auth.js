const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Collector = require('../models/Collector');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try User first, then Collector
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      req.user = await Collector.findById(decoded.id);
    }

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized for this action' });
    }
    next();
  };
};

// protect() loads either a User (admin/staff) or a Collector into req.user
const isCollector = (user) => user?.constructor?.modelName === 'Collector';

const collectorOnly = (req, res, next) => {
  if (!isCollector(req.user)) {
    return res.status(403).json({ message: 'Collector account required' });
  }
  next();
};

// The municipal council governs private operators (approve/reject/suspend, full list)
// from the existing admin dashboard, so the "super-admin" is simply an authenticated
// User with the 'admin' role — there is no separate account type. A Collector token
// can never carry role 'admin', so this also keeps collectors out. Use as a pair:
//   router.get('/', ...requireSuperAdmin, handler)
const requireSuperAdmin = [protect, authorize('admin')];

module.exports = { protect, authorize, isCollector, collectorOnly, requireSuperAdmin };
