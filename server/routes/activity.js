const express = require('express');
const router = express.Router();
const { getRecentActivity, logCollection, getDashboardStats } = require('../controllers/activityController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, getRecentActivity);
router.post('/collect', protect, authorize('admin', 'collector'), logCollection);
router.get('/dashboard', protect, getDashboardStats);

module.exports = router;
