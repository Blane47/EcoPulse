const jwt = require('jsonwebtoken');
const Operator = require('../models/Operator');

// Operator-admins sign in via operatorController.loginOperator, whose JWT carries
// { id, operatorId, role: 'operator-admin' }. The municipal admin's protect()
// middleware only resolves User/Collector tokens, so operator sessions get this
// dedicated gate: it verifies the token, confirms the role claim, loads the Operator
// onto req.operator, and blocks suspended accounts. Scoping to a specific operator's
// own resources is then done in the controllers against req.operator._id.
const operatorAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    if (decoded.role !== 'operator-admin') {
      return res.status(403).json({ message: 'Operator account required' });
    }

    const operator = await Operator.findById(decoded.id);
    if (!operator) {
      return res.status(401).json({ message: 'Operator account not found' });
    }
    if (operator.status === 'suspended') {
      return res.status(403).json({ message: 'Your account has been suspended. Contact the municipal council.' });
    }

    req.operator = operator;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

module.exports = { operatorAuth };
