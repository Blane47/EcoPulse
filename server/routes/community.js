const express = require('express');
const router = express.Router();
const CommunityUser = require('../models/CommunityUser');
const Message = require('../models/Message');

// Register or login by phone
router.post('/auth', async (req, res, next) => {
  try {
    const { name, phone, zone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Phone number is required' });

    // Check if user exists
    let user = await CommunityUser.findOne({ phone: phone.trim() });

    if (user) {
      // Returning user — update name/zone if provided
      if (name) user.name = name.trim();
      if (zone) user.zone = zone;
      await user.save();
      return res.json({ user, returning: true });
    }

    // New user
    if (!name) return res.status(400).json({ message: 'Name is required for new users' });

    user = await CommunityUser.create({
      name: name.trim(),
      phone: phone.trim(),
      zone: zone || 'Molyko',
    });

    res.status(201).json({ user, returning: false });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Phone number already registered' });
    }
    next(error);
  }
});

// Get user by phone
router.get('/:phone', async (req, res, next) => {
  try {
    const user = await CommunityUser.findOne({ phone: req.params.phone });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    next(error);
  }
});

// ── Community Chat ──

// Get messages for a community user's chat
router.get('/chat/:phone', async (req, res, next) => {
  try {
    const chatId = `community_${req.params.phone}`;
    const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

// Send a message from community user
router.post('/chat', async (req, res, next) => {
  try {
    const { phone, name, text } = req.body;
    if (!phone || !text) return res.status(400).json({ message: 'Phone and text are required' });

    const message = await Message.create({
      chatId: `community_${phone}`,
      sender: phone,
      senderName: name || phone,
      senderRole: 'community',
      text,
    });
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

// Get unread message count for community user
router.get('/chat/:phone/unread', async (req, res, next) => {
  try {
    const chatId = `community_${req.params.phone}`;
    const count = await Message.countDocuments({ chatId, read: false, senderRole: 'admin' });
    res.json({ unread: count });
  } catch (error) {
    next(error);
  }
});

// Mark messages as read (community user reading admin replies)
router.put('/chat/:phone/read', async (req, res, next) => {
  try {
    const chatId = `community_${req.params.phone}`;
    await Message.updateMany(
      { chatId, read: false, senderRole: 'admin' },
      { read: true }
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
