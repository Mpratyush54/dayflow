import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import Attendance from '../models/attendance.model.js';
import LeaveRequest from '../models/leave.model.js';
import Payroll from '../models/payroll.model.js';
import { buildPayrollStructure } from './salaryCalc.js';

/** Password for every seeded account (meets signup security rules). */
export const DEMO_PASSWORD = 'Dayflow!2026';

const DEFAULT_COMPONENTS = [
  { key: 'basic', mode: 'percent_of_wage', value: 50 },
  { key: 'hra', mode: 'percent_of_basic', value: 50 },
  { key: 'standard_allowance', mode: 'fixed', value: 2000 },
];

const SEED_USERS = [
  {
    employeeId: 'DF-1001',
    email: 'aarav@dayflow.dev',
    name: 'Aarav Sharma',
    role: 'EMPLOYEE',
    phone: '+91 98100 12345',
    address: '14 MG Road, Bengaluru, Karnataka 560001',
    dateOfBirth: '1996-03-14',
    nationality: 'Indian',
    gender: 'MALE',
    maritalStatus: 'SINGLE',
    personalEmail: 'aarav.sharma@gmail.com',
    bankAccountNo: '50100234567890',
    bankName: 'HDFC Bank',
    ifsc: 'HDFC0001234',
    pan: 'ABCDE1234F',
    designation: 'Software Engineer',
    department: 'Engineering',
    employmentType: 'FULL_TIME',
    dateOfJoining: '2023-07-03',
    workLocation: 'Bengaluru',
    status: 'ACTIVE',
    monthlyWage: 85000,
  },
  {
    employeeId: 'DF-1002',
    email: 'priya@dayflow.dev',
    name: 'Priya Nair',
    role: 'EMPLOYEE',
    phone: '+91 98220 45678',
    address: '8 Indiranagar, Bengaluru',
    dateOfBirth: '1994-11-02',
    nationality: 'Indian',
    gender: 'FEMALE',
    maritalStatus: 'MARRIED',
    designation: 'Senior Product Manager',
    department: 'Product',
    employmentType: 'FULL_TIME',
    dateOfJoining: '2022-04-18',
    workLocation: 'Bengaluru',
    status: 'ACTIVE',
    monthlyWage: 120000,
  },
  {
    employeeId: 'DF-1003',
    email: 'rahul@dayflow.dev',
    name: 'Rahul Verma',
    role: 'EMPLOYEE',
    phone: '+91 98765 43210',
    address: '221 Baker Street, Pune',
    dateOfBirth: '1991-08-21',
    nationality: 'Indian',
    gender: 'MALE',
    designation: 'UX Designer',
    department: 'Design',
    employmentType: 'FULL_TIME',
    dateOfJoining: '2021-09-01',
    workLocation: 'Pune',
    status: 'ACTIVE',
    monthlyWage: 72000,
  },
  {
    employeeId: 'DF-1004',
    email: 'sneha@dayflow.dev',
    name: 'Sneha Kapoor',
    role: 'EMPLOYEE',
    phone: '+91 99887 76655',
    address: '45 Bandra West, Mumbai',
    dateOfBirth: '1997-01-09',
    nationality: 'Indian',
    gender: 'FEMALE',
    designation: 'Marketing Specialist',
    department: 'Marketing',
    employmentType: 'FULL_TIME',
    dateOfJoining: '2023-01-16',
    workLocation: 'Mumbai',
    status: 'ACTIVE',
    monthlyWage: 65000,
  },
  {
    employeeId: 'DF-1005',
    email: 'vikram@dayflow.dev',
    name: 'Vikram Patel',
    role: 'EMPLOYEE',
    phone: '+91 91234 56789',
    address: '12 SG Highway, Ahmedabad',
    dateOfBirth: '1990-05-30',
    nationality: 'Indian',
    gender: 'MALE',
    designation: 'Account Executive',
    department: 'Sales',
    employmentType: 'FULL_TIME',
    dateOfJoining: '2020-11-09',
    workLocation: 'Ahmedabad',
    status: 'ACTIVE',
    monthlyWage: 58000,
  },
  {
    employeeId: 'DF-1006',
    email: 'ananya@dayflow.dev',
    name: 'Ananya Das',
    role: 'EMPLOYEE',
    phone: '+91 90011 22334',
    address: '3 Salt Lake, Kolkata',
    dateOfBirth: '1998-12-05',
    nationality: 'Indian',
    gender: 'FEMALE',
    designation: 'Support Engineer',
    department: 'Customer Success',
    employmentType: 'FULL_TIME',
    dateOfJoining: '2024-02-01',
    workLocation: 'Remote',
    status: 'ACTIVE',
    monthlyWage: 48000,
  },
  {
    employeeId: 'DF-1007',
    email: 'karan@dayflow.dev',
    name: 'Karan Mehta',
    role: 'EMPLOYEE',
    phone: '+91 94440 55667',
    address: '77 Anna Salai, Chennai',
    dateOfBirth: '1995-07-17',
    nationality: 'Indian',
    gender: 'MALE',
    designation: 'DevOps Engineer',
    department: 'Engineering',
    employmentType: 'FULL_TIME',
    dateOfJoining: '2022-08-22',
    workLocation: 'Chennai',
    status: 'ACTIVE',
    monthlyWage: 95000,
  },
  {
    employeeId: 'DF-2001',
    email: 'meera@dayflow.dev',
    name: 'Meera Iyer',
    role: 'HR',
    phone: '+91 98450 67890',
    address: '22 Koramangala, Bengaluru',
    designation: 'HR Executive',
    department: 'Human Resources',
    employmentType: 'FULL_TIME',
    dateOfJoining: '2022-01-10',
    workLocation: 'Bengaluru',
    status: 'ACTIVE',
    monthlyWage: 78000,
  },
  {
    employeeId: 'DF-9001',
    email: 'admin@dayflow.dev',
    name: 'Dev Admin',
    role: 'ADMIN',
    phone: '+91 90000 00000',
    designation: 'Office Administrator',
    department: 'Operations',
    employmentType: 'FULL_TIME',
    dateOfJoining: '2021-05-01',
    workLocation: 'Bengaluru',
    status: 'ACTIVE',
    monthlyWage: 90000,
  },
];

function utcDate(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d));
}

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

function localDateTime(key, hours, minutes = 0) {
  const base = parseDateKey(key);
  base.setHours(hours, minutes, 0, 0);
  return base;
}

function payrollFromWage(monthlyWage) {
  const built = buildPayrollStructure(monthlyWage, DEFAULT_COMPONENTS);
  return {
    basicSalary: built.basicSalary,
    currency: 'INR',
    allowances: built.allowances,
    deductions: built.deductions,
    effectiveFrom: new Date(),
  };
}

function salaryEmbedFromPayroll(payroll) {
  return {
    basicSalary: payroll.basicSalary,
    currency: payroll.currency,
    allowances: payroll.allowances,
    deductions: payroll.deductions,
  };
}

/** Upsert demo users by employeeId. */
export async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = [];
  for (const data of SEED_USERS) {
    const { monthlyWage, ...profile } = data;
    const payroll = payrollFromWage(monthlyWage ?? 50000);
    const user = await User.findOneAndUpdate(
      { employeeId: profile.employeeId },
      {
        ...profile,
        passwordHash,
        isVerified: true,
        mustChangePassword: false,
        salary: salaryEmbedFromPayroll(payroll),
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    );
    users.push(user);
  }
  return users;
}

/** Refresh attendance, leaves, and payroll for seeded users (safe to re-run). */
export async function seedDemoData(users) {
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  const hr = byEmail['meera@dayflow.dev'];
  const ids = users.map((u) => u._id);

  await Promise.all([
    Attendance.deleteMany({ user: { $in: ids } }),
    LeaveRequest.deleteMany({ userId: { $in: ids } }),
    Payroll.deleteMany({ userId: { $in: ids } }),
  ]);

  const payrollOps = users.map((user) => {
    const seed = SEED_USERS.find((s) => s.employeeId === user.employeeId);
    const built = payrollFromWage(seed?.monthlyWage ?? 50000);
    return Payroll.findOneAndUpdate(
      { userId: user._id },
      {
        userId: user._id,
        basicSalary: built.basicSalary,
        currency: 'INR',
        allowances: built.allowances,
        deductions: built.deductions,
        effectiveFrom: user.dateOfJoining ?? new Date(),
        revisions: [],
      },
      { upsert: true, returnDocument: 'after' },
    );
  });
  await Promise.all(payrollOps);

  const today = new Date();
  const todayKey = dateKey(today);
  const attendanceRows = [];

  const employeePatterns = {
    'aarav@dayflow.dev': { presence: 0.92, halfDayRate: 0.04 },
    'priya@dayflow.dev': { presence: 0.95, halfDayRate: 0.02 },
    'rahul@dayflow.dev': { presence: 0.88, halfDayRate: 0.08 },
    'sneha@dayflow.dev': { presence: 0.9, halfDayRate: 0.03 },
    'vikram@dayflow.dev': { presence: 0.82, halfDayRate: 0.06 },
    'ananya@dayflow.dev': { presence: 0.94, halfDayRate: 0.02 },
    'karan@dayflow.dev': { presence: 0.9, halfDayRate: 0.05 },
    'meera@dayflow.dev': { presence: 0.96, halfDayRate: 0.01 },
    'admin@dayflow.dev': { presence: 0.85, halfDayRate: 0.05 },
  };

  for (const user of users) {
    const pattern = employeePatterns[user.email] ?? { presence: 0.9, halfDayRate: 0.05 };
    for (let offset = -35; offset <= 0; offset++) {
      const day = addDays(today, offset);
      if (isWeekend(day)) continue;
      const key = dateKey(day);
      const roll = (user.employeeId.charCodeAt(user.employeeId.length - 1) + offset) % 100 / 100;
      if (roll > pattern.presence) continue;

      const halfDay = roll > pattern.presence - pattern.halfDayRate;
      const checkIn = localDateTime(key, halfDay ? 10 : 9, halfDay ? 30 : 15);
      let checkOut = null;
      let status = halfDay ? 'HALF_DAY' : 'PRESENT';

      if (key === todayKey && user.email === 'aarav@dayflow.dev') {
        checkOut = null;
      } else if (key === todayKey && user.email === 'vikram@dayflow.dev') {
        continue;
      } else {
        checkOut = localDateTime(key, halfDay ? 13 : 18, halfDay ? 30 : 0);
      }

      attendanceRows.push({
        user: user._id,
        date: key,
        checkIn,
        checkOut,
        status,
      });
    }
  }

  if (attendanceRows.length) {
    await Attendance.insertMany(attendanceRows);
  }

  const aarav = byEmail['aarav@dayflow.dev'];
  const priya = byEmail['priya@dayflow.dev'];
  const rahul = byEmail['rahul@dayflow.dev'];
  const sneha = byEmail['sneha@dayflow.dev'];
  const karan = byEmail['karan@dayflow.dev'];

  const leaveRows = [];

  if (sneha) {
    const leaveStart = addDays(today, -1);
    const leaveEnd = addDays(today, 1);
    leaveRows.push({
      userId: sneha._id,
      type: 'PAID',
      startDate: utcDate(leaveStart.getFullYear(), leaveStart.getMonth() + 1, leaveStart.getDate()),
      endDate: utcDate(leaveEnd.getFullYear(), leaveEnd.getMonth() + 1, leaveEnd.getDate()),
      remarks: 'Family event — demo approved leave',
      status: 'APPROVED',
      reviewerId: hr?._id,
      reviewerComment: 'Approved. Enjoy!',
    });
  }

  if (aarav) {
    const pastStart = addDays(today, -18);
    const pastEnd = addDays(pastStart, 1);
    leaveRows.push({
      userId: aarav._id,
      type: 'PAID',
      startDate: utcDate(pastStart.getFullYear(), pastStart.getMonth() + 1, pastStart.getDate()),
      endDate: utcDate(pastEnd.getFullYear(), pastEnd.getMonth() + 1, pastEnd.getDate()),
      remarks: 'Long weekend — demo history',
      status: 'APPROVED',
      reviewerId: hr?._id,
      reviewerComment: 'Approved',
    });
  }

  if (priya) {
    const futureStart = addDays(today, 7);
    while (isWeekend(futureStart)) futureStart.setDate(futureStart.getDate() + 1);
    const futureEnd = addDays(futureStart, 2);
    leaveRows.push({
      userId: priya._id,
      type: 'PAID',
      startDate: utcDate(futureStart.getFullYear(), futureStart.getMonth() + 1, futureStart.getDate()),
      endDate: utcDate(futureEnd.getFullYear(), futureEnd.getMonth() + 1, futureEnd.getDate()),
      remarks: 'Product offsite planning — pending review',
      status: 'PENDING',
    });
  }

  if (rahul) {
    const pendingStart = addDays(today, 3);
    while (isWeekend(pendingStart)) pendingStart.setDate(pendingStart.getDate() + 1);
    leaveRows.push({
      userId: rahul._id,
      type: 'SICK',
      startDate: utcDate(pendingStart.getFullYear(), pendingStart.getMonth() + 1, pendingStart.getDate()),
      endDate: utcDate(pendingStart.getFullYear(), pendingStart.getMonth() + 1, pendingStart.getDate()),
      remarks: 'Medical appointment — pending',
      status: 'PENDING',
    });

    const rejectedStart = addDays(today, -25);
    const rejectedEnd = addDays(rejectedStart, 2);
    leaveRows.push({
      userId: rahul._id,
      type: 'UNPAID',
      startDate: utcDate(rejectedStart.getFullYear(), rejectedStart.getMonth() + 1, rejectedStart.getDate()),
      endDate: utcDate(rejectedEnd.getFullYear(), rejectedEnd.getMonth() + 1, rejectedEnd.getDate()),
      remarks: 'Personal travel — demo rejected',
      status: 'REJECTED',
      reviewerId: hr?._id,
      reviewerComment: 'Critical sprint week — please reschedule',
    });
  }

  if (karan) {
    const sickStart = addDays(today, -8);
    leaveRows.push({
      userId: karan._id,
      type: 'SICK',
      startDate: utcDate(sickStart.getFullYear(), sickStart.getMonth() + 1, sickStart.getDate()),
      endDate: utcDate(sickStart.getFullYear(), sickStart.getMonth() + 1, sickStart.getDate()),
      remarks: 'Flu — demo sick leave',
      status: 'APPROVED',
      reviewerId: hr?._id,
      reviewerComment: 'Get well soon',
    });
  }

  if (leaveRows.length) {
    await LeaveRequest.insertMany(leaveRows);
  }

  return {
    users: users.length,
    attendance: attendanceRows.length,
    leaves: leaveRows.length,
    payroll: users.length,
  };
}

export async function seed() {
  const users = await seedUsers();
  const stats = await seedDemoData(users);
  return { users, stats };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — copy .env.example to .env and fill it in');
  }
  await mongoose.connect(url);
  const { users, stats } = await seed();
  console.log(`Seeded ${users.length} accounts.`);
  console.log(`  ${stats.attendance} attendance records · ${stats.leaves} leave requests · ${stats.payroll} payroll structures\n`);
  console.log(`Sign in at /signin with password "${DEMO_PASSWORD}":\n`);
  for (const user of users) {
    console.log(`  ${user.role.padEnd(8)} ${user.name.padEnd(18)} ${user.email}`);
  }
  console.log('\nTip: re-run `npm run seed` anytime to refresh demo attendance & leave data.');
  await mongoose.disconnect();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
