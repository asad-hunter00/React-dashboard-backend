import { Response } from 'express';
import { AuthRequest } from '../models/types.js';
import { DbService } from '../services/db.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class NotificationController {
  // GET /api/notifications
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const notifications = await DbService.getUserNotifications(req.user!.id);
      return sendSuccess(res, notifications, 'Notifications retrieved successfully');
    } catch (error: any) {
      console.error('[Get Notifications Error]', error);
      return sendError(res, error.message || 'Failed to fetch notifications', 500);
    }
  }

  // PUT /api/notifications/:id/read
  static async markRead(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updated = await DbService.markNotificationAsRead(id, req.user!.id);

      if (!updated) {
        return sendError(res, 'Notification not found or access denied', 404);
      }

      return sendSuccess(res, updated, 'Notification marked as read');
    } catch (error: any) {
      console.error('[Mark Notification Read Error]', error);
      return sendError(res, error.message || 'Failed to update notification', 500);
    }
  }

  // PUT /api/notifications/read-all
  static async markAllRead(req: AuthRequest, res: Response) {
    try {
      const count = await DbService.markAllNotificationsAsRead(req.user!.id);
      return sendSuccess(res, { count }, `Marked ${count} notifications as read`);
    } catch (error: any) {
      console.error('[Mark All Read Error]', error);
      return sendError(res, error.message || 'Failed to update notifications', 500);
    }
  }

  // DELETE /api/notifications/:id
  static async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const success = await DbService.deleteNotification(id, req.user!.id);

      if (!success) {
        return sendError(res, 'Notification not found or access denied', 404);
      }

      return sendSuccess(res, null, 'Notification deleted successfully');
    } catch (error: any) {
      console.error('[Delete Notification Error]', error);
      return sendError(res, error.message || 'Failed to delete notification', 500);
    }
  }
}
