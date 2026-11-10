const express = require('express');
const router = express.Router();
const { getAllCollectors, getCollectorById, createCollector, updateCollector, resetCollectorPassword, deleteCollector, getMyRoute, updateMyAvatar, setMyDuty } = require('../controllers/collectorController');
const { protect, authorize, collectorOnly } = require('../middleware/auth');

router.get('/me/route', protect, getMyRoute);
router.put('/me/avatar', protect, updateMyAvatar);
router.patch('/me/duty', protect, collectorOnly, setMyDuty);
router.get('/', protect, getAllCollectors);
router.get('/:id', protect, getCollectorById);
router.post('/', protect, authorize('admin'), createCollector);
router.put('/:id', protect, authorize('admin'), updateCollector);
router.post('/:id/reset-password', protect, authorize('admin'), resetCollectorPassword);
router.delete('/:id', protect, authorize('admin'), deleteCollector);

module.exports = router;
