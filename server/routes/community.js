const express = require('express');
const router = express.Router();
const CommunityUser = require('../models/CommunityUser');
const Message = require('../models/Message');
const { normalizePhone } = require('../utils/phone');
const { communityAuth, hashToken, newDeviceToken } = require('../middleware/communityAuth');
const { protect, authorize } = require('../middleware/auth');

const publicProfile = (user) => ({
  _id: user._id,
  name: user.name,
  phone: user.phone,
  zone: user.zone,
});

const chatIdFor = (user) => `community_${user.phone}`;

// Register a phone number, or sign back in from the device that registered it.
// The first device to register a number receives a device token; any other device
// is refused until an admin resets the number (see /users/:phone/reset-device).
router.post('/auth', async (req, res, next) => {
  try {
    const { name, zone } = req.body;
    const phone = normalizePhone(req.body.phone);
    if (!phone) return res.status(400).json({ message: 'Enter a valid phone number' });

    const presented = req.headers['x-device-token'];
    let user = await CommunityUser.findOne({ phone }).select('+deviceTokenHash');

    if (user) {
      const ownsNumber = !!presented && user.deviceTokenHash === hashToken(presented);
      if (user.deviceTokenHash && !ownsNumber) {
        return res.status(403).json({
          code: 'PHONE_CLAIMED',
          message: 'This number is already registered on another phone. Contact the municipality to move it to this phone.',
        });
      }

      let deviceToken = presented;
      if (!user.deviceTokenHash) {
        // Number registered before device tokens existed, or reset by an admin
        deviceToken = newDeviceToken();
        user.deviceTokenHash = hashToken(deviceToken);
      }
      if (name) user.name = name.trim();
      if (zone) user.zone = zone;
      await user.save();
      return res.json({ user: publicProfile(user), deviceToken, returning: true });
    }

    if (!name) return res.status(400).json({ message: 'Name is required for new users' });

    const deviceToken = newDeviceToken();
    user = await CommunityUser.create({
      name: name.trim(),
      phone,
      zone: zone || 'Molyko',
      deviceTokenHash: hashToken(deviceToken),
    });

    res.status(201).json({ user: publicProfile(user), deviceToken, returning: false });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Phone number already registered' });
    }
    next(error);
  }
});

// The signed-in resident's profile
router.get('/me', communityAuth, (req, res) => {
  res.json(publicProfile(req.communityUser));
});

// Admin: unlink a number from its device so the resident can register on a new phone
router.put('/users/:phone/reset-device', protect, authorize('admin'), async (req, res, next) => {
  try {
    const phone = normalizePhone(req.params.phone);
    if (!phone) return res.status(400).json({ message: 'Enter a valid phone number' });
    const user = await CommunityUser.findOneAndUpdate(
      { phone },
      { deviceTokenHash: null },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ message: 'Resident not found' });
    res.json({ success: true, user: publicProfile(user) });
  } catch (error) {
    next(error);
  }
});

// ── Community Chat (the signed-in resident's conversation with the municipality) ──

router.get('/chat', communityAuth, async (req, res, next) => {
  try {
    const messages = await Message.find({ chatId: chatIdFor(req.communityUser) }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

router.post('/chat', communityAuth, async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Message text is required' });

    const user = req.communityUser;
    const message = await Message.create({
      chatId: chatIdFor(user),
      sender: user.phone,
      senderName: user.name,
      senderRole: 'community',
      text,
    });
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

router.get('/chat/unread', communityAuth, async (req, res, next) => {
  try {
    const count = await Message.countDocuments({
      chatId: chatIdFor(req.communityUser),
      read: false,
      senderRole: 'admin',
    });
    res.json({ unread: count });
  } catch (error) {
    next(error);
  }
});

router.put('/chat/read', communityAuth, async (req, res, next) => {
  try {
    await Message.updateMany(
      { chatId: chatIdFor(req.communityUser), read: false, senderRole: 'admin' },
      { read: true }
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
