const express = require('express');
const router = express.Router();
const { getAllBins, getBinById, createBin, updateBin, deleteBin, getStats, getNearbyBins, collectBin } = require('../controllers/binController');
const { protect, authorize } = require('../middleware/auth');

router.get('/stats', protect, getStats);
router.get('/nearby', getNearbyBins);
router.get('/', getAllBins);
router.get('/:id', protect, getBinById);
router.post('/', protect, authorize('admin'), createBin);
router.patch('/:id/collect', protect, collectBin);
router.put('/:id', protect, authorize('admin', 'collector'), updateBin);
router.delete('/:id', protect, authorize('admin'), deleteBin);

module.exports = router;
