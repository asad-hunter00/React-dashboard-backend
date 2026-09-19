import { Response } from 'express';
import { AuthRequest, Role } from '../models/types.js';
import { DbService } from '../services/db.service.js';
import { hashPassword } from '../utils/hash.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class TeamController {
  // GET /api/team/members or GET /api/team
  static async getMembers(req: AuthRequest, res: Response) {
    try {
      const users = await DbService.getAllUsers();
      return sendSuccess(res, users, 'Team members retrieved successfully');
    } catch (error: any) {
      console.error('[Get Team Error]', error);
      return sendError(res, error.message || 'Failed to fetch team members', 500);
    }
  }

  // POST /api/team/members
  static async addMember(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;

      // Admin or Owner can add team members
      if (user.role === 'Member') {
        return sendError(res, 'Access denied. Only Admins and Owners can add team members.', 403);
      }

      const { name, email, role, password } = req.body;

      if (!name || !email) {
        return sendError(res, 'Name and email are required', 400);
      }

      // Check duplicate email
      const existing = await DbService.findUserByEmail(email);
      if (existing) {
        return sendError(res, 'A user with this email address already exists in Taskflow', 409);
      }

      // If assigning Owner role, only current Owner can do it
      const targetRole: Role = role || 'Member';
      if (targetRole === 'Owner' && user.role !== 'Owner') {
        return sendError(res, 'Only an Owner can assign the Owner role to another member.', 403);
      }

      // Generate a default temporary password if not supplied
      const initialPassword = password || 'Taskflow2026!';
      const hashedPassword = await hashPassword(initialPassword);

      const newMember = await DbService.createUser({
        name,
        email,
        password: hashedPassword,
        role: targetRole,
      });

      // Add to default General channel
      const general = await DbService.ensureDefaultChannel();
      await DbService.addChannelMember(general.id, newMember.id);

      // Record activity
      await DbService.recordActivity({
        action: 'Member added',
        entityType: 'MEMBER',
        entityId: newMember.id,
        details: `Added ${newMember.name} as ${targetRole}`,
        userId: user.id,
      });

      return sendSuccess(
        res,
        {
          member: newMember,
          temporaryPassword: initialPassword,
        },
        'Team member added successfully',
        201
      );
    } catch (error: any) {
      console.error('[Add Member Error]', error);
      return sendError(res, error.message || 'Failed to add team member', 500);
    }
  }

  // DELETE /api/team/members/:id
  static async removeMember(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;

      if (user.role === 'Member') {
        return sendError(res, 'Access denied. Only Admins and Owners can remove team members.', 403);
      }

      const target = await DbService.findUserById(id);
      if (!target) {
        return sendError(res, 'Team member not found', 404);
      }

      if (target.id === user.id) {
        return sendError(res, 'You cannot remove yourself from the team.', 400);
      }

      if (target.role === 'Owner') {
        return sendError(res, 'The Owner cannot be removed.', 403);
      }

      if (user.role === 'Admin' && target.role === 'Admin') {
        return sendError(res, 'Admins cannot remove other Admins. Only the Owner can perform this action.', 403);
      }

      await DbService.deleteUser(id);

      await DbService.recordActivity({
        action: 'Member removed',
        entityType: 'MEMBER',
        entityId: id,
        details: `Removed ${target.name} from the team`,
        userId: user.id,
      });

      return sendSuccess(res, null, 'Team member removed successfully');
    } catch (error: any) {
      console.error('[Remove Member Error]', error);
      return sendError(res, error.message || 'Failed to remove team member', 500);
    }
  }

  // PUT /api/team/members/:id/role
  static async changeRole(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !['Owner', 'Admin', 'Member'].includes(role)) {
        return sendError(res, 'Valid role is required (Owner, Admin, or Member)', 400);
      }

      if (user.role === 'Member') {
        return sendError(res, 'Access denied. Only Admins and Owners can change member roles.', 403);
      }

      const target = await DbService.findUserById(id);
      if (!target) {
        return sendError(res, 'Team member not found', 404);
      }

      // If user is Admin, they cannot change Owner role, or promote to Owner
      if (user.role === 'Admin') {
        if (target.role === 'Owner') {
          return sendError(res, 'Admins cannot modify the Owner role.', 403);
        }
        if (role === 'Owner') {
          return sendError(res, 'Admins cannot promote a user to Owner.', 403);
        }
      }

      const updated = await DbService.updateUser(id, { role });

      await DbService.recordActivity({
        action: 'Member role changed',
        entityType: 'MEMBER',
        entityId: id,
        details: `Changed role of ${target.name} to ${role}`,
        userId: user.id,
      });

      return sendSuccess(res, updated, 'Member role updated successfully');
    } catch (error: any) {
      console.error('[Change Role Error]', error);
      return sendError(res, error.message || 'Failed to update member role', 500);
    }
  }
}
