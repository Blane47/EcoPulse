const crypto = require('crypto');

// One-time password an admin hands to a collector; no look-alike characters (0/O, 1/l/I)
const CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

const tempPassword = (length = 10) =>
  Array.from({ length }, () => CHARS[crypto.randomInt(CHARS.length)]).join('');

module.exports = { tempPassword };
