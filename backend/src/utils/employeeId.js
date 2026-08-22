import User from '../models/user.model.js';

// Company prefix for employee IDs, e.g. "OI" (Odoo India)
export const COMPANY_CODE = (process.env.COMPANY_CODE ?? 'OI').toUpperCase();

const lettersOnly = (s) => s.replace(/[^A-Za-z]/g, '').toUpperCase();

// First two letters of the first name + first two of the last name, e.g. "JODO"
export function initialsFor(firstName, lastName) {
  const first = lettersOnly(firstName ?? '').slice(0, 2).padEnd(2, 'X');
  const last = lettersOnly(lastName ?? '').slice(0, 2).padEnd(2, 'X');
  return `${first}${last}`;
}

/**
 * Next employee ID: COMPANY + INITIALS + YEAR + 4-digit serial.
 * The serial counts ALL employees joining that year (any initials),
 * e.g. 1st joiner in 2026 → OIJYDO20260001, 2nd → OIJODO20260002.
 */
export async function nextEmployeeId(firstName, lastName, year = new Date().getFullYear()) {
  const pattern = new RegExp(`^${COMPANY_CODE}[A-Z]{4}${year}(\\d{4})$`);
  const latest = await User.findOne({ employeeId: pattern })
    .sort({ employeeId: -1 })
    .select('employeeId')
    .lean();
  const serial = latest ? Number(latest.employeeId.slice(-4)) + 1 : 1;
  return `${COMPANY_CODE}${initialsFor(firstName, lastName)}${year}${String(serial).padStart(4, '0')}`;
}
