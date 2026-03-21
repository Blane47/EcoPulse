const express = require('express');
const router = express.Router();
const { getChats, getMessages, sendMessage, markRead } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getChats);
router.get('/:chatId', protect, getMessages);
router.post('/', protect, sendMessage);
router.put('/:chatId/read', protect, markRead);

module.exports = router;
