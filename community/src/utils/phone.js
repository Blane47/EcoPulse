// Mirrors server/utils/phone.js so the app stores numbers in the same canonical
// +237XXXXXXXXX form the server uses. Returns null for unreadable input.
export function normalizePhone(input) {
  if (input === undefined || input === null) return null;
  const raw = String(input).trim();
  const hasPlus = raw.startsWith('+');
  let digits = raw.replace(/\D/g, '');
  if (!hasPlus && digits.startsWith('00')) digits = digits.slice(2);

  if (digits.length === 9) return `+237${digits}`;
  if (digits.length === 12 && digits.startsWith('237')) return `+${digits}`;
  if ((hasPlus || raw.startsWith('00')) && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}
