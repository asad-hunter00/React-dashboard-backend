import { Response } from 'express';
import { AuthRequest, ProjectStatus, Priority } from '../models/types.js';
import { DbService } from '../services/db.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class ProjectController {
  // POST /api/projects
  static async create(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      // Owner and Admin can create projects
      if (user.role === 'Member') {
        return sendError(res, 'Access denied. Only Admins and Owners can create projects.', 403);
      }

      const { name, description, status, priority, progress, dueDate } = req.body;

      if (!name) {
        return sendError(res, 'Project name is required', 400);
      }

      const project = await DbService.createProject({
        name,
        description,
        status: status as ProjectStatus,
        priority: priority as Priority,
        progress: typeof progress === 'number' ? progress : 0,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: user.id,
      });

      // Record activity
      await DbService.recordActivity({
        action: 'Project created',
        entityType: 'PROJECT',
        entityId: project.id,
        details: `Created project "${project.name}"`,
        userId: user.id,
        projectId: project.id,
      });

      return sendSuccess(res, project, 'Project created successfully', 201);
    } catch (error: any) {
      console.error('[Create Project Error]', error);
      return sendError(res, error.message || 'Failed to create project', 500);
    }
  }

  // GET /api/projects
  static async getAll(req: AuthRequest, res: Response) {
    try {
      const { status, priority, search } = req.query;

      const projects = await DbService.getProjects({
        status: status as ProjectStatus,
        priority: priority as Priority,
        search: typeof search === 'string' ? search : undefined,
      });

      return sendSuccess(res, projects, 'Projects retrieved successfully');
    } catch (error: any) {
      console.error('[Get Projects Error]', error);
      return sendError(res, error.message || 'Failed to fetch projects', 500);
    }
  }

  // GET /api/projects/:id
  static async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const project = await DbService.getProjectById(id);

      if (!project) {
        return sendError(res, 'Project not found', 404);
      }

      return sendSuccess(res, project, 'Project retrieved successfully');
    } catch (error: any) {
      console.error('[Get Project Error]', error);
      return sendError(res, error.message || 'Failed to fetch project', 500);
    }
  }

  // PUT /api/projects/:id
  static async update(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;

      if (user.role === 'Member') {
        return sendError(res, 'Access denied. Only Admins and Owners can update projects.', 403);
      }

      const existing = await DbService.getProjectById(id);
      if (!existing) {
        return sendError(res, 'Project not found', 404);
      }

      const { name, description, status, priority, progress, dueDate } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (status !== undefined) updateData.status = status;
      if (priority !== undefined) updateData.priority = priority;
      if (progress !== undefined) updateData.progress = progress;
      if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

      const updated = await DbService.updateProject(id, updateData);

      // Record activity
      await DbService.recordActivity({
        action: 'Project updated',
        entityType: 'PROJECT',
        entityId: id,
        details: `Updated project "${updated?.name || id}"`,
        userId: user.id,
        projectId: id,
      });

      return sendSuccess(res, updated, 'Project updated successfully');
    } catch (error: any) {
      console.error('[Update Project Error]', error);
      return sendError(res, error.message || 'Failed to update project', 500);
    }
  }

  // DELETE /api/projects/:id
  static async delete(req: AuthRequest, res: Response) {
    try {
      const user = req.user!;
      const { id } = req.params;

      if (user.role === 'Member') {
        return sendError(res, 'Access denied. Only Admins and Owners can delete projects.', 403);
      }

      const existing = await DbService.getProjectById(id);
      if (!existing) {
        return sendError(res, 'Project not found', 404);
      }

      await DbService.deleteProject(id);

      await DbService.recordActivity({
        action: 'Project deleted',
        entityType: 'PROJECT',
        entityId: id,
        details: `Deleted project "${existing.name}"`,
        userId: user.id,
      });

      return sendSuccess(res, null, 'Project deleted successfully');
    } catch (error: any) {
      console.error('[Delete Project Error]', error);
      return sendError(res, error.message || 'Failed to delete project', 500);
    }
  }
}
