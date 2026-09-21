import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Password and confirmPassword must match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address format'),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address format'),
  otp: z.string().length(6, 'OTP must be a 6-digit code'),
});

export const changePasswordSchema = z.object({
  email: z.string().email('Invalid email address format'),
  otp: z.string().length(6, 'OTP must be a 6-digit code'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Password and confirmPassword must match',
  path: ['confirmPassword'],
});

export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').max(100).optional(),
  avatar: z.string().url('Avatar must be a valid URL').or(z.string().length(0)).nullable().optional(),
});

export const changeEmailSchema = z.object({
  newEmail: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Current password is required to verify email change'),
});

export const userChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New password and confirmPassword must match',
  path: ['confirmPassword'],
});
