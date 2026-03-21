const Message = require('../models/Message');

// Get all chats (admin view) — returns latest message per unique chatId
exports.getChats = async (req, res, next) => {
  try {
    const chats = await Message.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$chatId',
          lastMessage: { $first: '$text' },
          lastSender: { $first: '$senderRole' },
          senderName: { $first: '$senderName' },
          updatedAt: { $first: '$createdAt' },
          unread: {
            $sum: {
              $cond: [{ $and: [{ $ne: ['$senderRole', 'admin'] }, { $eq: ['$read', false] }] }, 1, 0],
            },
          },
        },
      },
      { $sort: { updatedAt: -1 } },
    ]);
    res.json(chats);
  } catch (error) {
    next(error);
  }
};

// Get messages for a specific chat
exports.getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// Send a message
exports.sendMessage = async (req, res, next) => {
  try {
    const { chatId, text } = req.body;
    const user = req.user;

    const isCollector = !!user.pin;
    const message = await Message.create({
      chatId: chatId || user._id.toString(),
      sender: user._id.toString(),
      senderName: user.name,
      senderRole: isCollector ? 'collector' : 'admin',
      text,
    });
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

// Mark messages as read
exports.markRead = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    await Message.updateMany(
      { chatId, read: false, senderRole: { $ne: 'admin' } },
      { read: true }
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
