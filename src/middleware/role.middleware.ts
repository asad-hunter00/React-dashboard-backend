import { Response, NextFunction } from 'express';
import { AuthRequest, Role } from '../models/types.js';
import { sendError } from '../utils/response.js';

export function requireRole(allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Authentication required', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}.`,
        403
      );
    }

    next();
  };
}

export function requireOwner(req: AuthRequest, res: Response, next: NextFunction) {
  return requireRole(['Owner'])(req, res, next);
}

export function requireAdminOrOwner(req: AuthRequest, res: Response, next: NextFunction) {
  return requireRole(['Owner', 'Admin'])(req, res, next);
}
