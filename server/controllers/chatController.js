const mongoose = require('mongoose');
const Message = require('../models/Message');
const Collector = require('../models/Collector');
const { isCollector } = require('../middleware/auth');

// A collector's conversation with the admin uses the collector's id as chatId.
// Collectors may only touch their own chat; admins may open any chat.
const resolveChatId = (user, requestedChatId) => {
  if (isCollector(user)) {
    const own = user._id.toString();
    return !requestedChatId || requestedChatId === own ? own : null;
  }
  return user.role === 'admin' ? requestedChatId : null;
};

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
          // Newest first: names of the non-admin side, so the chat is labelled with the other person
          otherNames: { $push: { $cond: [{ $ne: ['$senderRole', 'admin'] }, '$senderName', '$$REMOVE'] } },
          updatedAt: { $first: '$createdAt' },
          unread: {
            $sum: {
              $cond: [{ $and: [{ $ne: ['$senderRole', 'admin'] }, { $eq: ['$read', false] }] }, 1, 0],
            },
          },
        },
      },
      { $sort: { updatedAt: -1 } },
      { $addFields: { participantName: { $arrayElemAt: ['$otherNames', 0] } } },
      { $project: { otherNames: 0 } },
    ]);

    // A collector chat where only the admin has written yet: look the collector up by id
    const unnamed = chats.filter((c) => !c.participantName && mongoose.isValidObjectId(c._id));
    if (unnamed.length) {
      const collectors = await Collector.find({ _id: { $in: unnamed.map((c) => c._id) } }).select('name');
      const names = new Map(collectors.map((c) => [c._id.toString(), c.name]));
      unnamed.forEach((c) => { c.participantName = names.get(c._id) || null; });
    }
    res.json(chats);
  } catch (error) {
    next(error);
  }
};

// Get messages for a specific chat
exports.getMessages = async (req, res, next) => {
  try {
    const chatId = resolveChatId(req.user, req.params.chatId);
    if (!chatId) return res.status(403).json({ message: 'Not authorized for this chat' });
    const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    next(error);
  }
};

// Send a message
exports.sendMessage = async (req, res, next) => {
  try {
    const { text } = req.body;
    const user = req.user;
    if (!text?.trim()) return res.status(400).json({ message: 'Message text is required' });

    const chatId = resolveChatId(user, req.body.chatId);
    if (!chatId) return res.status(403).json({ message: 'Not authorized for this chat' });

    const message = await Message.create({
      chatId,
      sender: user._id.toString(),
      senderName: user.name,
      senderRole: isCollector(user) ? 'collector' : 'admin',
      text,
    });
    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

// Mark the other side's messages as read
exports.markRead = async (req, res, next) => {
  try {
    const chatId = resolveChatId(req.user, req.params.chatId);
    if (!chatId) return res.status(403).json({ message: 'Not authorized for this chat' });

    // A collector reads the admin's replies; the admin reads everyone else's messages
    const senderRole = isCollector(req.user) ? 'admin' : { $ne: 'admin' };
    await Message.updateMany({ chatId, read: false, senderRole }, { read: true });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
