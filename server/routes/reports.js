const express = require('express');
const router = express.Router();
const { createReport, getReportsByDevice, getAllReports, updateReportStatus } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

// Public — community can submit reports without auth
router.post('/', createReport);
router.get('/user/:deviceId', getReportsByDevice);

// Admin only
router.get('/', protect, authorize('admin'), getAllReports);
router.patch('/:id', protect, authorize('admin'), updateReportStatus);

module.exports = router;
