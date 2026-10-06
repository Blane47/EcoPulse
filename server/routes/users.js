const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// Dashboard staff accounts. New accounts are created through POST /auth/register (admin only).
router.use(protect, authorize('admin'));

router.get('/', async (req, res, next) => {
  try {
    const users = await User.find().select('name email role createdAt').sort({ createdAt: 1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't remove your own account" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin' && (await User.countDocuments({ role: 'admin' })) <= 1) {
      return res.status(400).json({ message: "Can't remove the last admin" });
    }
    await user.deleteOne();
    res.json({ message: 'User removed' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
