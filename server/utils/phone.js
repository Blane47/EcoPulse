// Phone numbers are stored in one canonical form: +237 followed by the 9-digit
// national number, with no spaces (e.g. +237670000001). Unique indexes compare
// exact strings, so every number must be normalised before it is saved or looked up.

/**
 * Normalise a phone number to +237XXXXXXXXX.
 * Accepts "670000001", "237670000001", "+237 670 000 001", "00237 670-000-001".
 * Returns null when the input can't be read as a phone number.
 */
function normalizePhone(input) {
  if (input === undefined || input === null) return null;
  const raw = String(input).trim();
  const hasPlus = raw.startsWith('+');
  let digits = raw.replace(/\D/g, '');
  if (!hasPlus && digits.startsWith('00')) digits = digits.slice(2);

  // Bare 9-digit Cameroon number
  if (digits.length === 9) return `+237${digits}`;
  // Cameroon number with country code
  if (digits.length === 12 && digits.startsWith('237')) return `+${digits}`;
  // Any other international number written with + or 00
  if ((hasPlus || String(input).trim().startsWith('00')) && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

module.exports = { normalizePhone };
