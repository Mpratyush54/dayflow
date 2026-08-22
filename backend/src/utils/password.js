import crypto from 'crypto';

// Generates a strong one-time password: 14 chars, guaranteed to satisfy
// the password schema (upper + lower + digit + special).
export function generatePassword(length = 14) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*?';
  const all = upper + lower + digits + special;

  const pick = (set) => set[crypto.randomInt(set.length)];
  const chars = [pick(upper), pick(lower), pick(digits), pick(special)];
  while (chars.length < length) chars.push(pick(all));

  // Fisher–Yates shuffle so the guaranteed classes aren't always up front
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
