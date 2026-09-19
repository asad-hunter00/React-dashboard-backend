import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(150),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']).optional().default('PLANNING'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  progress: z.number().min(0).max(100).optional().default(0),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  progress: z.number().min(0).max(100).optional(),
  dueDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).nullable().optional(),
});
