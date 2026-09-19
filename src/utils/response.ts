import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export function sendSuccess<T = any>(
  res: Response,
  data?: T,
  message: string = 'Success',
  statusCode: number = 200
): Response {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined ? { data } : {}),
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string = 'An error occurred',
  statusCode: number = 400
): Response {
  return res.status(statusCode).json({
    success: false,
    message,
  });
}
