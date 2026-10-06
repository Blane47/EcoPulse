const express = require('express');
const router = express.Router();
const {
  createReport, getMyReports, getAllReports, updateReportStatus,
  assignReport, getMyAssignedReports, submitProof, reviewProof,
} = require('../controllers/reportController');
const { protect, authorize, collectorOnly } = require('../middleware/auth');
const { communityAuth } = require('../middleware/communityAuth');

// Residents (device token)
router.post('/', communityAuth, createReport);
router.get('/mine', communityAuth, getMyReports);

// Collectors
router.get('/assigned/me', protect, collectorOnly, getMyAssignedReports);
router.post('/:id/proof', protect, collectorOnly, submitProof);

// Admin only
router.get('/', protect, authorize('admin'), getAllReports);
router.patch('/:id/assign', protect, authorize('admin'), assignReport);
router.patch('/:id/review', protect, authorize('admin'), reviewProof);
router.patch('/:id', protect, authorize('admin'), updateReportStatus);

module.exports = router;
