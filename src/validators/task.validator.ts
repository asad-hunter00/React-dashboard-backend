import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(200),
  description: z.string().max(3000).nullable().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional().default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
  projectId: z.string().uuid().or(z.string().min(1)).nullable().optional(),
  assignedTo: z.string().uuid().or(z.string().min(1)).nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(3000).nullable().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
  projectId: z.string().uuid().or(z.string().min(1)).nullable().optional(),
  assignedTo: z.string().uuid().or(z.string().min(1)).nullable().optional(),
});

export const updateTaskStatusSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
});

export const updateTaskPrioritySchema = z.object({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});

export const assignTaskSchema = z.object({
  assignedTo: z.string().min(1, 'Assignee user ID is required').nullable(),
});
