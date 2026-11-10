const express = require('express');
const router = express.Router();
const {
  registerOperator,
  loginOperator,
  getAvailableOperators,
  getOperatorById,
  getAllOperators,
  approveOperator,
  rejectOperator,
  suspendOperator,
  updateOperator,
} = require('../controllers/operatorController');
const { requireSuperAdmin } = require('../middleware/auth');
const { operatorAuth } = require('../middleware/operatorAuth');

// Public: self-registration + operator-admin login
router.post('/register', registerOperator);
router.post('/login', loginOperator);

// Public: operators a resident may browse/request
router.get('/available', getAvailableOperators);

// Super-admin: full operator list (municipal council dashboard)
router.get('/', ...requireSuperAdmin, getAllOperators);

// Public operator detail (keep below /available so it is not shadowed)
router.get('/:id', getOperatorById);

// Super-admin lifecycle
router.patch('/:id/approve', ...requireSuperAdmin, approveOperator);
router.patch('/:id/reject', ...requireSuperAdmin, rejectOperator);
router.patch('/:id/suspend', ...requireSuperAdmin, suspendOperator);

// Operator updates own profile (operatorAuth + self-ownership check in the controller)
router.patch('/:id', operatorAuth, updateOperator);

module.exports = router;
