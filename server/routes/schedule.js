const express = require('express');
const router = express.Router();
const { getScheduleByZone, createSchedule, updateSchedule } = require('../controllers/scheduleController');
const { protect, authorize } = require('../middleware/auth');

// Public — community can view schedules
router.get('/:zone', getScheduleByZone);

// Admin only
router.post('/', protect, authorize('admin'), createSchedule);
router.put('/:id', protect, authorize('admin'), updateSchedule);

module.exports = router;
