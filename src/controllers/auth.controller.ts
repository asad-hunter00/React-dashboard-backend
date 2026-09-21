import { Request, Response } from 'express';
import { DbService } from '../services/db.service.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { generateToken } from '../utils/jwt.js';
import { generateSixDigitOtp, hashOtp, verifyOtpHash } from '../utils/otp.js';
import { sendOtpEmail } from '../utils/mailer.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class AuthController {
  // POST /api/auth/register
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password, confirmPassword } = req.body;

      if (!name || !email || !password || !confirmPassword) {
        return sendError(res, 'All fields are required (name, email, password, confirmPassword)', 400);
      }

      if (password !== confirmPassword) {
        return sendError(res, 'Password and confirmPassword must match', 400);
      }

      if (password.length < 8) {
        return sendError(res, 'Password must be at least 8 characters long', 400);
      }

      // Check duplicate email
      const existingUser = await DbService.findUserByEmail(email);
      if (existingUser) {
        return sendError(res, 'An account with this email address already exists', 409);
      }

      // Hash password with bcrypt
      const hashedPassword = await hashPassword(password);

      // Check if this is the first user (if so, make Owner)
      const allUsers = await DbService.getAllUsers();
      const role = allUsers.length === 0 ? 'Owner' : 'Member';

      const newUser = await DbService.createUser({
        name,
        email,
        password: hashedPassword,
        role,
      });

      // Add to default General channel
      const generalChannel = await DbService.ensureDefaultChannel();
      await DbService.addChannelMember(generalChannel.id, newUser.id);

      // Generate JWT
      const token = generateToken(newUser);

      // Record activity
      await DbService.recordActivity({
        action: 'Member registered',
        entityType: 'USER',
        entityId: newUser.id,
        details: `${newUser.name} joined Taskflow as ${role}`,
        userId: newUser.id,
      });

      return sendSuccess(
        res,
        {
          token,
          user: newUser,
        },
        'Account created successfully',
        201
      );
    } catch (error: any) {
      console.error('[Register Error]', error);
      return sendError(res, error.message || 'Registration failed', 500);
    }
  }

  // POST /api/auth/login
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return sendError(res, 'Email and password are required', 400);
      }

      const userWithPw = await DbService.findUserByEmail(email);
      if (!userWithPw) {
        return sendError(res, 'Invalid email or password', 401);
      }

      const isPasswordValid = await comparePassword(password, userWithPw.password);
      if (!isPasswordValid) {
        return sendError(res, 'Invalid email or password', 401);
      }

      const { password: _, ...user } = userWithPw;
      const token = generateToken(user);

      return sendSuccess(
        res,
        {
          token,
          user,
        },
        'Login successful',
        200
      );
    } catch (error: any) {
      console.error('[Login Error]', error);
      return sendError(res, error.message || 'Login failed', 500);
    }
  }

  // POST /api/auth/forgot-password
  // Flow 1-5: User sends email -> Generate 6-digit OTP -> Save hashed OTP -> Expires after 5 min -> Send OTP via Nodemailer
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return sendError(res, 'Email address is required', 400);
      }



      const user = await DbService.findUserByEmail(email);
      if (!user) {
        return sendError(res, 'This email is not registered', 404);
      }




      // Generate 6-digit OTP
      const otp = generateSixDigitOtp();
      const hashedOtp = await hashOtp(otp);

      // OTP expires after 5 minutes
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Save hashed OTP in database
      await DbService.createOtp(email, hashedOtp, expiresAt);

      // Send OTP to user's email using Nodemailer
      await sendOtpEmail(email, otp);

      return sendSuccess(
        res,
        { email, expiresInMinutes: 5 },
        'A 6-digit verification code has been sent to your email.'
      );
    } catch (error: any) {
      console.error('[Forgot Password Error]', error);
      return sendError(res, error.message || 'Failed to process password reset', 500);
    }
  }

  // POST /api/auth/verify-otp
  // Flow 6-7: User sends email + OTP to backend -> Verify OTP -> Allow password change
  static async verifyOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return sendError(res, 'Email and 6-digit OTP code are required', 400);
      }

      const validOtpRecord = await DbService.findValidOtp(email);
      if (!validOtpRecord) {
        return sendError(res, 'Verification code has expired or is invalid. Please request a new one.', 400);
      }

      const isMatch = await verifyOtpHash(otp, validOtpRecord.hashedOtp);
      if (!isMatch) {
        return sendError(res, 'Invalid verification code. Please check and try again.', 400);
      }

      return sendSuccess(
        res,
        {
          verified: true,
          email,
          otpId: validOtpRecord.id,
        },
        'Verification code confirmed. You can now reset your password.'
      );
    } catch (error: any) {
      console.error('[Verify OTP Error]', error);
      return sendError(res, error.message || 'OTP verification failed', 500);
    }
  }

  // POST /api/auth/reset-password
  // Flow 8: Allow password change -> Validate passwords (>=8 chars, match) -> Hash with bcrypt -> Update in DB -> Invalidate used OTP
  static async resetPassword(req: Request, res: Response) {
    try {
      const { email, otp, newPassword, confirmPassword } = req.body;

      if (!email || !otp || !newPassword || !confirmPassword) {
        return sendError(
          res,
          'Email, OTP, newPassword, and confirmPassword are all required',
          400
        );
      }

      if (newPassword !== confirmPassword) {
        return sendError(res, 'New password and confirmPassword must match', 400);
      }

      if (newPassword.length < 8) {
        return sendError(res, 'Password must be at least 8 characters long', 400);
      }

      const validOtpRecord = await DbService.findValidOtp(email);
      if (!validOtpRecord) {
        return sendError(res, 'Verification code has expired or is invalid. Please request a new one.', 400);
      }

      const isMatch = await verifyOtpHash(otp, validOtpRecord.hashedOtp);
      if (!isMatch) {
        return sendError(res, 'Invalid verification code', 400);
      }

      const user = await DbService.findUserByEmail(email);
      if (!user) {
        return sendError(res, 'User account not found', 404);
      }

      // Hash new password with bcrypt
      const hashedNewPassword = await hashPassword(newPassword);

      // Update password in database
      await DbService.updateUser(user.id, { password: hashedNewPassword });

      // Invalidate the used OTP
      await DbService.invalidateOtp(validOtpRecord.id);

      return sendSuccess(
        res,
        null,
        'Password has been reset successfully. You can now log in with your new password.'
      );
    } catch (error: any) {
      console.error('[Reset Password Error]', error);
      return sendError(res, error.message || 'Failed to update password', 500);
    }
  }
}
