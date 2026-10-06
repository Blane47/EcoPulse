// Collector sign-in emails are stored lower-cased and trimmed
const normalizeEmail = (input) => (typeof input === 'string' ? input.trim().toLowerCase() : '');
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);

module.exports = { normalizeEmail, isValidEmail };
