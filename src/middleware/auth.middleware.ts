import { Response, NextFunction } from 'express';
import { AuthRequest } from '../models/types.js';
import { verifyToken } from '../utils/jwt.js';
import { DbService } from '../services/db.service.js';
import { sendError } from '../utils/response.js';

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 'Authentication required. Missing or malformed token.', 401);
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);

  if (!payload || !payload.userId) {
    return sendError(res, 'Invalid or expired access token. Please log in again.', 401);
  }

  try {
    const user = await DbService.findUserById(payload.userId);
    if (!user) {
      return sendError(res, 'User associated with this token no longer exists.', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 'Authentication verification failed.', 401);
  }
}
