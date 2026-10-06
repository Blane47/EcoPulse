const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect, collectorOnly } = require('../middleware/auth');

router.use(protect, collectorOnly);

// Latest notifications for the signed-in collector, plus the unread count
router.get('/', async (req, res, next) => {
  try {
    const recipient = req.user._id;
    const [notifications, unread] = await Promise.all([
      Notification.find({ recipient }).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ recipient, read: false }),
    ]);
    res.json({ notifications, unread });
  } catch (error) {
    next(error);
  }
});

router.put('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/read', async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { returnDocument: 'after' }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
