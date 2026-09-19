import { Response } from 'express';
import { AuthRequest, TaskStatus, Priority } from '../models/types.js';
import { DbService } from '../services/db.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class TaskController {
  // POST /api/tasks
  static async create(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { title, description, status, priority, dueDate, projectId, assignedTo } = req.body;

      if (!title) {
        return sendError(res, 'Task title is required', 400);
      }

      // If assigning to another member, verify member permission (Admin/Owner can assign to anyone; Member can assign to self)
      if (assignedTo && assignedTo !== user.id && user.role === 'Member') {
        return sendError(res, 'Members can only assign tasks to themselves. Admins or Owners can assign to any team member.', 403);
      }

      const task = await DbService.createTask({
        title,
        description,
        status: (status as TaskStatus) || 'TODO',
        priority: (priority as Priority) || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: projectId || null,
        assignedTo: assignedTo || null,
        createdBy: user.id,
      });

      // Record activity
      await DbService.recordActivity({
        action: 'Task created',
        entityType: 'TASK',
        entityId: task.id,
        details: `Created task "${task.title}"`,
        userId: user.id,
        projectId: task.projectId,
      });

      // If assigned to someone else, create a notification
      if (task.assignedTo && task.assignedTo !== user.id) {
        await DbService.createNotification({
          userId: task.assignedTo,
          title: 'New Task Assigned',
          message: `${user.name} assigned task "${task.title}" to you.`,
          type: 'task_assigned',
        });

        await DbService.recordActivity({
          action: 'Task assigned',
          entityType: 'TASK',
          entityId: task.id,
          details: `Assigned task "${task.title}" to team member`,
          userId: user.id,
          projectId: task.projectId,
        });
      }

      return sendSuccess(res, task, 'Task created successfully', 201);
    } catch (error: any) {
      console.error('[Create Task Error]', error);
      return sendError(res, error.message || 'Failed to create task', 500);
    }
  }

  // GET /api/tasks
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const { status, priority, projectId, assignedTo, createdBy, search, dueDate } = req.query;

      const tasks = await DbService.getTasks({
        status: status as TaskStatus,
        priority: priority as Priority,
        projectId: typeof projectId === 'string' ? projectId : undefined,
        assignedTo: typeof assignedTo === 'string' ? assignedTo : undefined,
        createdBy: typeof createdBy === 'string' ? createdBy : undefined,
        search: typeof search === 'string' ? search : undefined,
        dueDate: dueDate ? new Date(dueDate as string) : undefined,
      });

      return sendSuccess(res, tasks, 'Tasks retrieved successfully');
    } catch (error: any) {
      console.error('[Get Tasks Error]', error);
      return sendError(res, error.message || 'Failed to fetch tasks', 500);
    }
  }

  // GET /api/tasks/:id
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const task = await DbService.getTaskById(id);

      if (!task) {
        return sendError(res, 'Task not found', 404);
      }

      return sendSuccess(res, task, 'Task retrieved successfully');
    } catch (error: any) {
      console.error('[Get Task Error]', error);
      return sendError(res, error.message || 'Failed to fetch task', 500);
    }
  }

  // PUT /api/tasks/:id
  static async update(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;

      const existing = await DbService.getTaskById(id);
      if (!existing) {
        return sendError(res, 'Task not found', 404);
      }

      // Member can only edit tasks assigned to or created by them
      if (
        user.role === 'Member' &&
        existing.createdBy !== user.id &&
        existing.assignedTo !== user.id
      ) {
        return sendError(res, 'Access denied. You can only update tasks assigned to or created by you.', 403);
      }

      const { title, description, status, priority, dueDate, projectId, assignedTo } = req.body;

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;
      if (priority !== undefined) updateData.priority = priority;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
      if (projectId !== undefined) updateData.projectId = projectId || null;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;

      const updated = await DbService.updateTask(id, updateData);

      // Check for completion activity
      if (status === 'DONE' && existing.status !== 'DONE') {
        await DbService.recordActivity({
          action: 'Task completed',
          entityType: 'TASK',
          entityId: id,
          details: `Completed task "${updated?.title || id}"`,
          userId: user.id,
          projectId: updated?.projectId,
        });
      } else {
        await DbService.recordActivity({
          action: 'Task updated',
          entityType: 'TASK',
          entityId: id,
          details: `Updated task "${updated?.title || id}"`,
          userId: user.id,
          projectId: updated?.projectId,
        });
      }

      // Check for re-assignment notification
      if (assignedTo && assignedTo !== existing.assignedTo && assignedTo !== user.id) {
        await DbService.createNotification({
          userId: assignedTo,
          title: 'Task Assigned',
          message: `${user.name} assigned task "${updated?.title}" to you.`,
          type: 'task_assigned',
        });

        await DbService.recordActivity({
          action: 'Task assigned',
          entityType: 'TASK',
          entityId: id,
          details: `Assigned task "${updated?.title}" to team member`,
          userId: user.id,
          projectId: updated?.projectId,
        });
      }

      return sendSuccess(res, updated, 'Task updated successfully');
    } catch (error: any) {
      console.error('[Update Task Error]', error);
      return sendError(res, error.message || 'Failed to update task', 500);
    }
  }

  // PUT /api/tasks/:id/complete
  static async complete(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;

      const existing = await DbService.getTaskById(id);
      if (!existing) {
        return sendError(res, 'Task not found', 404);
      }

      if (
        user.role === 'Member' &&
        existing.createdBy !== user.id &&
        existing.assignedTo !== user.id
      ) {
        return sendError(res, 'Access denied. You can only complete your own tasks.', 403);
      }

      const updated = await DbService.updateTask(id, { status: 'DONE' });

      await DbService.recordActivity({
        action: 'Task completed',
        entityType: 'TASK',
        entityId: id,
        details: `Marked task "${updated?.title}" as complete`,
        userId: user.id,
        projectId: updated?.projectId,
      });

      return sendSuccess(res, updated, 'Task marked as completed');
    } catch (error: any) {
      console.error('[Complete Task Error]', error);
      return sendError(res, error.message || 'Failed to complete task', 500);
    }
  }

  // PUT /api/tasks/:id/status
  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return sendError(res, 'Status is required', 400);
      }

      const existing = await DbService.getTaskById(id);
      if (!existing) {
        return sendError(res, 'Task not found', 404);
      }

      if (
        user.role === 'Member' &&
        existing.createdBy !== user.id &&
        existing.assignedTo !== user.id
      ) {
        return sendError(res, 'Access denied. You can only update your own tasks.', 403);
      }

      const updated = await DbService.updateTask(id, { status });

      if (status === 'DONE') {
        await DbService.recordActivity({
          action: 'Task completed',
          entityType: 'TASK',
          entityId: id,
          details: `Completed task "${updated?.title}"`,
          userId: user.id,
          projectId: updated?.projectId,
        });
      } else {
        await DbService.recordActivity({
          action: 'Task status changed',
          entityType: 'TASK',
          entityId: id,
          details: `Changed status of "${updated?.title}" to ${status}`,
          userId: user.id,
          projectId: updated?.projectId,
        });
      }

      return sendSuccess(res, updated, 'Task status updated');
    } catch (error: any) {
      console.error('[Update Task Status Error]', error);
      return sendError(res, error.message || 'Failed to update task status', 500);
    }
  }

  // PUT /api/tasks/:id/priority
  static async updatePriority(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { priority } = req.body;

      if (!priority) {
        return sendError(res, 'Priority is required', 400);
      }

      const existing = await DbService.getTaskById(id);
      if (!existing) {
        return sendError(res, 'Task not found', 404);
      }

      if (
        user.role === 'Member' &&
        existing.createdBy !== user.id &&
        existing.assignedTo !== user.id
      ) {
        return sendError(res, 'Access denied. You can only update your own tasks.', 403);
      }

      const updated = await DbService.updateTask(id, { priority });

      await DbService.recordActivity({
        action: 'Task priority changed',
        entityType: 'TASK',
        entityId: id,
        details: `Changed priority of "${updated?.title}" to ${priority}`,
        userId: user.id,
        projectId: updated?.projectId,
      });

      return sendSuccess(res, updated, 'Task priority updated');
    } catch (error: any) {
      console.error('[Update Task Priority Error]', error);
      return sendError(res, error.message || 'Failed to update priority', 500);
    }
  }

  // PUT /api/tasks/:id/assign
  static async assign(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;
      const { assignedTo } = req.body;

      if (user.role === 'Member' && assignedTo !== user.id) {
        return sendError(res, 'Only Admins and Owners can assign tasks to other members.', 403);
      }

      const existing = await DbService.getTaskById(id);
      if (!existing) {
        return sendError(res, 'Task not found', 404);
      }

      if (assignedTo) {
        const targetUser = await DbService.findUserById(assignedTo);
        if (!targetUser) {
          return sendError(res, 'Target user not found', 404);
        }
      }

      const updated = await DbService.updateTask(id, { assignedTo: assignedTo || null });

      if (assignedTo && assignedTo !== user.id) {
        await DbService.createNotification({
          userId: assignedTo,
          title: 'Task Assigned',
          message: `${user.name} assigned task "${updated?.title}" to you.`,
          type: 'task_assigned',
        });
      }

      await DbService.recordActivity({
        action: 'Task assigned',
        entityType: 'TASK',
        entityId: id,
        details: assignedTo ? `Assigned task "${updated?.title}"` : `Unassigned task "${updated?.title}"`,
        userId: user.id,
        projectId: updated?.projectId,
      });

      return sendSuccess(res, updated, 'Task assignment updated');
    } catch (error: any) {
      console.error('[Assign Task Error]', error);
      return sendError(res, error.message || 'Failed to assign task', 500);
    }
  }

  // DELETE /api/tasks/:id
  static async delete(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;

      const existing = await DbService.getTaskById(id);
      if (!existing) {
        return sendError(res, 'Task not found', 404);
      }

      // Member can only delete tasks they created
      if (user.role === 'Member' && existing.createdBy !== user.id) {
        return sendError(res, 'Access denied. You can only delete tasks you created.', 403);
      }

      await DbService.deleteTask(id);

      await DbService.recordActivity({
        action: 'Task deleted',
        entityType: 'TASK',
        entityId: id,
        details: `Deleted task "${existing.title}"`,
        userId: user.id,
        projectId: existing.projectId,
      });

      return sendSuccess(res, null, 'Task deleted successfully');
    } catch (error: any) {
      console.error('[Delete Task Error]', error);
      return sendError(res, error.message || 'Failed to delete task', 500);
    }
  }
}
