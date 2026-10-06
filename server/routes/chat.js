const express = require('express');
const router = express.Router();
const { getChats, getMessages, sendMessage, markRead } = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', protect, authorize('admin'), getChats);
router.get('/:chatId', protect, getMessages);
router.post('/', protect, sendMessage);
router.put('/:chatId/read', protect, markRead);

module.exports = router;
