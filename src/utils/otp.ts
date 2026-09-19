import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function generateSixDigitOtp(): string {
  // Generate cryptographically strong 6-digit number between 100000 and 999999
  return crypto.randomInt(100000, 1000000).toString();
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtpHash(otp: string, hashedOtp: string): Promise<boolean> {
  return bcrypt.compare(otp, hashedOtp);
}
