import { Response } from 'express';
import { AuthRequest } from '../models/types.js';
import { DbService } from '../services/db.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class ChannelController {
  // POST /api/channels
  static async create(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { name, description } = req.body;

      if (!name) {
        return sendError(res, 'Channel name is required', 400);
      }

      if (user.role === 'Member') {
        return sendError(res, 'Access denied. Only Admins and Owners can create channels.', 403);
      }

      const channel = await DbService.createChannel({
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        description: description || null,
      });

      // Automatically add creator to channel
      await DbService.addChannelMember(channel.id, user.id);

      await DbService.recordActivity({
        action: 'Channel created',
        entityType: 'CHANNEL',
        entityId: channel.id,
        details: `Created channel #${channel.name}`,
        userId: user.id,
      });

      return sendSuccess(res, channel, 'Channel created successfully', 201);
    } catch (error: any) {
      console.error('[Create Channel Error]', error);
      return sendError(res, error.message || 'Failed to create channel', 500);
    }
  }

  // GET /api/channels
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const channels = await DbService.getChannels();
      return sendSuccess(res, channels, 'Channels retrieved successfully');
    } catch (error: any) {
      console.error('[Get Channels Error]', error);
      return sendError(res, error.message || 'Failed to fetch channels', 500);
    }
  }

  // GET /api/channels/:id
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const channel = await DbService.getChannelById(id);

      if (!channel) {
        return sendError(res, 'Channel not found', 404);
      }

      return sendSuccess(res, channel, 'Channel retrieved successfully');
    } catch (error: any) {
      console.error('[Get Channel Error]', error);
      return sendError(res, error.message || 'Failed to fetch channel', 500);
    }
  }

  // POST /api/channels/:id/members
  static async addMember(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return sendError(res, 'Target user ID is required', 400);
      }

      const channel = await DbService.getChannelById(id);
      if (!channel) {
        return sendError(res, 'Channel not found', 404);
      }

      const targetUser = await DbService.findUserById(userId);
      if (!targetUser) {
        return sendError(res, 'Target user not found', 404);
      }

      const member = await DbService.addChannelMember(id, userId);

      await DbService.recordActivity({
        action: 'Member added to channel',
        entityType: 'CHANNEL',
        entityId: id,
        details: `Added ${targetUser.name} to #${channel.name}`,
        userId: user.id,
      });

      return sendSuccess(res, member, 'Member added to channel successfully', 201);
    } catch (error: any) {
      console.error('[Add Channel Member Error]', error);
      return sendError(res, error.message || 'Failed to add member to channel', 500);
    }
  }

  // DELETE /api/channels/:id/members/:userId
  static async removeMember(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { id, userId } = req.params;

      const channel = await DbService.getChannelById(id);
      if (!channel) {
        return sendError(res, 'Channel not found', 404);
      }

      // Member can leave a channel themselves; Admins/Owners can remove anyone
      if (user.role === 'Member' && user.id !== userId) {
        return sendError(res, 'Access denied. You can only remove yourself from channels.', 403);
      }

      await DbService.removeChannelMember(id, userId);

      await DbService.recordActivity({
        action: 'Member removed from channel',
        entityType: 'CHANNEL',
        entityId: id,
        details: `Member removed from #${channel.name}`,
        userId: user.id,
      });

      return sendSuccess(res, null, 'Member removed from channel successfully');
    } catch (error: any) {
      console.error('[Remove Channel Member Error]', error);
      return sendError(res, error.message || 'Failed to remove member from channel', 500);
    }
  }
}
