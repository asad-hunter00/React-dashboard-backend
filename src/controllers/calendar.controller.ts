import { Response } from 'express';
import { AuthRequest } from '../models/types.js';
import { DbService } from '../services/db.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class CalendarController {
  // GET /api/calendar/day?date=YYYY-MM-DD
  static async getTasksByDay(req: AuthRequest, res: Response) {
    try {
      const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const targetDate = new Date(dateStr);

      if (isNaN(targetDate.getTime())) {
        return sendError(res, 'Invalid date format. Expected YYYY-MM-DD', 400);
      }

      const start = new Date(targetDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(targetDate);
      end.setHours(23, 59, 59, 999);

      const tasks = await DbService.getTasks({
        startDate: start,
        endDate: end,
      });

      return sendSuccess(
        res,
        {
          date: dateStr,
          count: tasks.length,
          tasks,
        },
        'Tasks for day retrieved successfully'
      );
    } catch (error: any) {
      console.error('[Calendar Day Error]', error);
      return sendError(res, error.message || 'Failed to fetch calendar day tasks', 500);
    }
  }

  // GET /api/calendar/week?date=YYYY-MM-DD
  static async getTasksByWeek(req: AuthRequest, res: Response) {
    try {
      const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const targetDate = new Date(dateStr);

      if (isNaN(targetDate.getTime())) {
        return sendError(res, 'Invalid date format. Expected YYYY-MM-DD', 400);
      }

      // Calculate start of week (Sunday or Monday, standard week: Sunday = day 0)
      const dayOfWeek = targetDate.getDay();
      const startOfWeek = new Date(targetDate);
      startOfWeek.setDate(targetDate.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const tasks = await DbService.getTasks({
        startDate: startOfWeek,
        endDate: endOfWeek,
      });

      return sendSuccess(
        res,
        {
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: endOfWeek.toISOString().split('T')[0],
          count: tasks.length,
          tasks,
        },
        'Tasks for week retrieved successfully'
      );
    } catch (error: any) {
      console.error('[Calendar Week Error]', error);
      return sendError(res, error.message || 'Failed to fetch calendar week tasks', 500);
    }
  }

  // GET /api/calendar/month?year=2026&month=9 (month 1-12 or date=YYYY-MM-DD)
  static async getTasksByMonth(req: AuthRequest, res: Response) {
    try {
      let year: number;
      let month: number; // 1 to 12

      if (req.query.year && req.query.month) {
        year = parseInt(req.query.year as string, 10);
        month = parseInt(req.query.month as string, 10);
      } else if (req.query.date) {
        const d = new Date(req.query.date as string);
        year = d.getFullYear();
        month = d.getMonth() + 1;
      } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth() + 1;
      }

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return sendError(res, 'Invalid year or month. Month must be 1-12.', 400);
      }

      const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

      const tasks = await DbService.getTasks({
        startDate: startOfMonth,
        endDate: endOfMonth,
      });

      return sendSuccess(
        res,
        {
          year,
          month,
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: endOfMonth.toISOString().split('T')[0],
          count: tasks.length,
          tasks,
        },
        'Tasks for month retrieved successfully'
      );
    } catch (error: any) {
      console.error('[Calendar Month Error]', error);
      return sendError(res, error.message || 'Failed to fetch calendar month tasks', 500);
    }
  }

  // GET /api/calendar/due-date?date=YYYY-MM-DD
  static async getTasksByDueDate(req: AuthRequest, res: Response) {
    try {
      const dateStr = req.query.date as string;
      if (!dateStr) {
        return sendError(res, 'Query parameter ?date=YYYY-MM-DD is required', 400);
      }

      const target = new Date(dateStr);
      if (isNaN(target.getTime())) {
        return sendError(res, 'Invalid date format. Expected YYYY-MM-DD', 400);
      }

      const start = new Date(target);
      start.setHours(0, 0, 0, 0);

      const end = new Date(target);
      end.setHours(23, 59, 59, 999);

      const tasks = await DbService.getTasks({
        startDate: start,
        endDate: end,
      });

      return sendSuccess(
        res,
        {
          dueDate: dateStr,
          count: tasks.length,
          tasks,
        },
        'Tasks for due date retrieved successfully'
      );
    } catch (error: any) {
      console.error('[Calendar Due Date Error]', error);
      return sendError(res, error.message || 'Failed to fetch tasks by due date', 500);
    }
  }
}
