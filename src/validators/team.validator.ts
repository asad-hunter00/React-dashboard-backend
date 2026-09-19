import { z } from 'zod';

export const addTeamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address format'),
  role: z.enum(['Owner', 'Admin', 'Member']).optional().default('Member'),
  password: z.string().min(8, 'Temporary password must be at least 8 characters').optional(),
});

export const changeRoleSchema = z.object({
  role: z.enum(['Owner', 'Admin', 'Member']),
});
