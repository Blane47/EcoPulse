const express = require('express');
const router = express.Router();
const { register, login, getMe, collectorLogin } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/collector-login', collectorLogin);
router.get('/me', protect, getMe);

module.exports = router;
