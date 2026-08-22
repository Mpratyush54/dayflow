import { z } from 'zod';

// Password security rules: min 8 chars, upper + lower + digit + special
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');

// HR/Admin creating an employee — the employeeId and initial password are
// generated server-side, never supplied by the client.
export const createEmployeeSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50),
  lastName: z.string().trim().min(1, 'Last name is required').max(50),
  email: z.email('Invalid email address').transform((v) => v.toLowerCase()),
  role: z.enum(['EMPLOYEE', 'HR', 'ADMIN']).default('EMPLOYEE'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

export const signinSchema = z.object({
  email: z.email('Invalid email address').transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});
