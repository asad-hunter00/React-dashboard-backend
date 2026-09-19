import { Response } from 'express';
import { AuthRequest } from '../models/types.js';
import { DbService } from '../services/db.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class ActivityController {
  // GET /api/activities
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const { projectId, userId, entityType, limit } = req.query;

      const activities = await DbService.getActivities({
        projectId: typeof projectId === 'string' ? projectId : undefined,
        userId: typeof userId === 'string' ? userId : undefined,
        entityType: typeof entityType === 'string' ? entityType : undefined,
        limit: limit ? parseInt(limit as string, 10) : 50,
      });

      return sendSuccess(res, activities, 'Activities retrieved successfully');
    } catch (error: any) {
      console.error('[Get Activities Error]', error);
      return sendError(res, error.message || 'Failed to fetch activities', 500);
    }
  }
}
