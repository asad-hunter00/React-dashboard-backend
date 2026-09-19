import { Response } from 'express';
import { AuthRequest } from '../models/types.js';
import { DbService } from '../services/db.service.js';
import { hashPassword, comparePassword } from '../utils/hash.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class UserController {
  // GET /api/users/me
  static async getCurrentUser(req: AuthRequest, res: Response) {
    try {
      const user = await DbService.findUserById(req.user!.id);
      if (!user) {
        return sendError(res, 'User not found', 404);
      }
      return sendSuccess(res, user, 'User profile retrieved');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to fetch user', 500);
    }
  }

  // PUT /api/users/profile
  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const { name, avatar } = req.body;
      const updateData: { name?: string; avatar?: string | null } = {};

      if (name !== undefined) updateData.name = name;
      if (avatar !== undefined) updateData.avatar = avatar;

      const updated = await DbService.updateUser(req.user!.id, updateData);
      if (!updated) {
        return sendError(res, 'User not found', 404);
      }

      await DbService.recordActivity({
        action: 'Profile updated',
        entityType: 'USER',
        entityId: updated.id,
        details: `${updated.name} updated profile details`,
        userId: updated.id,
      });

      return sendSuccess(res, updated, 'Profile updated successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update profile', 500);
    }
  }

  // PUT /api/users/email
  static async changeEmail(req: AuthRequest, res: Response) {
    try {
      const { newEmail, password } = req.body;

      if (!newEmail || !password) {
        return sendError(res, 'New email and current password are required', 400);
      }

      // Check current password
      const userWithPw = await DbService.findUserByEmail(req.user!.email);
      if (!userWithPw) {
        return sendError(res, 'User not found', 404);
      }

      const isPasswordValid = await comparePassword(password, userWithPw.password);
      if (!isPasswordValid) {
        return sendError(res, 'Invalid password. Cannot verify identity.', 401);
      }

      // Check if new email is already taken
      const existing = await DbService.findUserByEmail(newEmail);
      if (existing && existing.id !== req.user!.id) {
        return sendError(res, 'This email address is already in use by another account', 409);
      }

      const updated = await DbService.updateUser(req.user!.id, { email: newEmail });

      await DbService.recordActivity({
        action: 'Email changed',
        entityType: 'USER',
        entityId: req.user!.id,
        details: `Email changed to ${newEmail}`,
        userId: req.user!.id,
      });

      return sendSuccess(res, updated, 'Email changed successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to change email', 500);
    }
  }

  // PUT /api/users/password
  static async changePassword(req: AuthRequest, res: Response) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword || !confirmPassword) {
        return sendError(
          res,
          'Current password, new password, and confirm password are required',
          400
        );
      }

      if (newPassword !== confirmPassword) {
        return sendError(res, 'New password and confirm password must match', 400);
      }

      if (newPassword.length < 8) {
        return sendError(res, 'New password must be at least 8 characters long', 400);
      }

      const userWithPw = await DbService.findUserByEmail(req.user!.email);
      if (!userWithPw) {
        return sendError(res, 'User not found', 404);
      }

      const isPasswordValid = await comparePassword(currentPassword, userWithPw.password);
      if (!isPasswordValid) {
        return sendError(res, 'Current password is incorrect', 401);
      }

      const hashedNewPassword = await hashPassword(newPassword);
      await DbService.updateUser(req.user!.id, { password: hashedNewPassword });

      await DbService.recordActivity({
        action: 'Password changed',
        entityType: 'USER',
        entityId: req.user!.id,
        details: 'User password was changed securely',
        userId: req.user!.id,
      });

      return sendSuccess(res, null, 'Password changed successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to change password', 500);
    }
  }

  // PUT /api/users/avatar
  static async updateAvatar(req: AuthRequest, res: Response) {
    try {
      const { avatar } = req.body;

      if (avatar === undefined) {
        return sendError(res, 'Avatar URL or string is required', 400);
      }

      const updated = await DbService.updateUser(req.user!.id, { avatar });

      return sendSuccess(res, updated, 'Avatar updated successfully');
    } catch (error: any) {
      return sendError(res, error.message || 'Failed to update avatar', 500);
    }
  }

  // POST /api/users/logout
  static async logout(req: AuthRequest, res: Response) {
    // In stateless JWT, the client drops the token, but we acknowledge logout and record activity
    return sendSuccess(res, null, 'Logged out successfully');
  }
}
