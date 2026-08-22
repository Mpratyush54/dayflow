import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';

// Password for every seeded account (meets the signup security rules)
const DEMO_PASSWORD = 'Dayflow!2026';

// Creates three demo employees with full profiles so the employee profile
// feature can be demoed before the auth module lands. Safe to re-run —
// it upserts by employeeId.

const SEED_USERS = [
  {
    employeeId: 'DF-1001',
    email: 'aarav@dayflow.dev',
    name: 'Aarav Sharma',
    role: 'EMPLOYEE',
    phone: '+91 98100 12345',
    address: '14 MG Road, Bengaluru',
    dateOfBirth: '1996-03-14',
    profilePicture: '',
    designation: 'Software Engineer',
    department: 'Engineering',
    employmentType: 'FULL_TIME',
    dateOfJoining: '2023-07-03',
    workLocation: 'Bengaluru',
    status: 'ACTIVE',
    salary: {
      basicSalary: 45000,
      currency: 'INR',
      allowances: { house_rent: 8000, travel: 1500 },
      deductions: { provident_fund: 1800, tax: 2200 },
    },
    documents: [
      { name: 'Offer letter', url: 'https://example.com/docs/offer-letter.pdf' },
      { name: 'ID proof', url: 'https://example.com/docs/id-proof.pdf' },
    ],
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
    salary: { basicSalary: 52000, currency: 'INR', allowances: { travel: 2000 }, deductions: { provident_fund: 2100 } },
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
    salary: { basicSalary: 60000, currency: 'INR' },
  },
];

export async function seed() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const users = [];
  for (const data of SEED_USERS) {
    const user = await User.findOneAndUpdate(
      { employeeId: data.employeeId },
      { ...data, passwordHash, isVerified: true },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    );
    users.push(user);
  }
  return users;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — copy .env.example to .env and fill it in');
  }
  await mongoose.connect(url);
  const users = await seed();
  console.log(`Seeded ${users.length} employees.\n`);
  console.log(`Sign in at /signin with password "${DEMO_PASSWORD}" using:`);
  for (const user of users) {
    console.log(`  ${user.role.padEnd(8)} ${user.name} → ${user.email}`);
  }
  await mongoose.disconnect();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
