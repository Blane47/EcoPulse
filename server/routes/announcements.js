const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { protect, authorize } = require('../middleware/auth');

// GET all announcements (public — community users can read)
router.get('/', async (req, res) => {
  try {
    const { zone } = req.query;
    const query = zone ? { zone: { $in: [zone, 'all'] } } : {};
    const announcements = await Announcement.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('createdBy', 'name');
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new announcement (admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { title, message, zone, type } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }
    const announcement = await Announcement.create({
      title,
      message,
      zone: zone || 'all',
      type: type || 'info',
      createdBy: req.user._id,
    });
    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE announcement (admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
