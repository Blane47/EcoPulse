const express = require('express');
const router = express.Router();
const { getAllCollectors, getCollectorById, createCollector, updateCollector, deleteCollector } = require('../controllers/collectorController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, getAllCollectors);
router.get('/:id', protect, getCollectorById);
router.post('/', protect, authorize('admin'), createCollector);
router.put('/:id', protect, authorize('admin'), updateCollector);
router.delete('/:id', protect, authorize('admin'), deleteCollector);

module.exports = router;
