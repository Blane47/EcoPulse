const express = require('express');
const router = express.Router();
const { register, login, getMe, collectorLogin, updateProfile, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/collector-login', collectorLogin);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/me/password', protect, changePassword);

module.exports = router;
