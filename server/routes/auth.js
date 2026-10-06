const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword, collectorLogin } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

// Only an existing admin can create dashboard accounts (the body can set the role)
router.post('/register', protect, authorize('admin'), register);
router.post('/login', login);
router.post('/collector-login', collectorLogin);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/me/password', protect, changePassword);

module.exports = router;
