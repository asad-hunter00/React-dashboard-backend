import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response.js';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstIssue = error.issues[0];
        const errorMessage = firstIssue
          ? `${firstIssue.path.length > 0 ? `${firstIssue.path.join('.')}: ` : ''}${firstIssue.message}`
          : 'Validation failed';
        return sendError(res, errorMessage, 400);
      }
      return sendError(res, 'Invalid request data', 400);
    }
  };
}
