import { z } from 'zod';

// Password security rules: min 8 chars, upper + lower + digit + special
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must include an uppercase letter')
  .regex(/[a-z]/, 'Password must include a lowercase letter')
  .regex(/[0-9]/, 'Password must include a number')
  .regex(/[^A-Za-z0-9]/, 'Password must include a special character');

export const signupSchema = z.object({
  employeeId: z.string().trim().min(2, 'Employee ID must be at least 2 characters').max(20, 'Employee ID must be at most 20 characters'),
  email: z.email('Invalid email address').transform((v) => v.toLowerCase()),
  password: passwordSchema,
  role: z.enum(['EMPLOYEE', 'HR']),
});

export const signinSchema = z.object({
  email: z.email('Invalid email address').transform((v) => v.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});
