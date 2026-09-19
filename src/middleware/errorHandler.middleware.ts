import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[Taskflow API Error]', err);

  // Zod parsing error fallback
  if (err?.name === 'ZodError') {
    const message = err.issues?.[0]?.message || 'Validation error';
    return sendError(res, message, 400);
  }

  // SyntaxError in JSON body
  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(res, 'Malformed JSON payload in request body', 400);
  }

  // JWT errors
  if (err?.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token signature', 401);
  }
  if (err?.name === 'TokenExpiredError') {
    return sendError(res, 'Token has expired', 401);
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return sendError(res, message, statusCode);
}
