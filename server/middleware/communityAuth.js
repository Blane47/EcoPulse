const crypto = require('crypto');
const CommunityUser = require('../models/CommunityUser');

// Residents have no password. Instead, the first device to register a phone number
// receives a random device token; only its SHA-256 hash is stored. Requests that
// act as a resident must send the token in the X-Device-Token header.

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const newDeviceToken = () => crypto.randomBytes(32).toString('hex');

const communityAuth = async (req, res, next) => {
  try {
    const token = req.headers['x-device-token'];
    if (!token) {
      return res.status(401).json({ message: 'This device is not registered', code: 'NO_DEVICE_TOKEN' });
    }
    const user = await CommunityUser.findOne({ deviceTokenHash: hashToken(token) });
    if (!user) {
      return res.status(401).json({ message: 'This device is no longer linked to an account', code: 'DEVICE_TOKEN_INVALID' });
    }
    req.communityUser = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { communityAuth, hashToken, newDeviceToken };
