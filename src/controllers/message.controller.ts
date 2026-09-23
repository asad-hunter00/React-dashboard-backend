import { Response } from 'express';
import { AuthRequest } from '../models/types.js';
import { DbService } from '../services/db.service.js';
import { broadcastNewMessage } from '../services/socket.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class MessageController {
  static async send(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { channelId } = req.params;
      const { message } = req.body;

      if (!message || !message.trim()) {
        return sendError(res, 'Message text is required', 400);
      }

      const channel = await DbService.getChannelById(channelId);

      if (!channel) {
        return sendError(res, 'Channel not found', 404);
      }

      const createdMsg = await DbService.createMessage({
        channelId,
        userId: user.id,
        message: message.trim(),
      });

      broadcastNewMessage(channelId, createdMsg);

      await DbService.recordActivity({
        action: 'Message sent',
        entityType: 'MESSAGE',
        entityId: createdMsg.id,
        details: `Sent message in #${channel.name}`,
        userId: user.id,
      });

      return sendSuccess(
        res,
        createdMsg,
        'Message sent successfully',
        201
      );
    } catch (error: any) {
      console.error('[Send Message Error]', error);

      return sendError(
        res,
        error.message || 'Failed to send message',
        500
      );
    }
  }

  static async getByChannel(req: AuthRequest, res: Response) {
    try {
      const { channelId } = req.params;

      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 100;

      const channel = await DbService.getChannelById(channelId);

      if (!channel) {
        return sendError(res, 'Channel not found', 404);
      }

      const messages = await DbService.getChannelMessages(
        channelId,
        limit
      );

      return sendSuccess(
        res,
        messages,
        'Messages retrieved successfully'
      );
    } catch (error: any) {
      console.error('[Get Messages Error]', error);

      return sendError(
        res,
        error.message || 'Failed to fetch messages',
        500
      );
    }
  }

  static async update(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { message } = req.body;

      if (!message || !message.trim()) {
        return sendError(res, 'Message text is required', 400);
      }

      const existingMessage = await DbService.getMessageById(id);

      if (!existingMessage) {
        return sendError(res, 'Message not found', 404);
      }

      if (
        user.role === 'Member' &&
        existingMessage.userId !== user.id
      ) {
        return sendError(
          res,
          'Access denied. You can only edit your own messages.',
          403
        );
      }

      const updatedMessage = await DbService.updateMessage(
        id,
        message.trim()
      );

      if (!updatedMessage) {
        return sendError(res, 'Message not found', 404);
      }

      return sendSuccess(
        res,
        updatedMessage,
        'Message updated successfully'
      );
    } catch (error: any) {
      console.error('[Update Message Error]', error);

      return sendError(
        res,
        error.message || 'Failed to update message',
        500
      );
    }
  }

  static async delete(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;

      const message = await DbService.getMessageById(id);

      if (!message) {
        return sendError(res, 'Message not found', 404);
      }

      if (
        user.role === 'Member' &&
        message.userId !== user.id
      ) {
        return sendError(
          res,
          'Access denied. You can only delete your own messages.',
          403
        );
      }

      await DbService.deleteMessage(id);

      return sendSuccess(
        res,
        null,
        'Message deleted successfully'
      );
    } catch (error: any) {
      console.error('[Delete Message Error]', error);

      return sendError(
        res,
        error.message || 'Failed to delete message',
        500
      );
    }
  }
}