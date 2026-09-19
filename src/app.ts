import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { sendError } from './utils/response.js';

export function createApp(): Express {
  const app = express();

  // CORS Configuration for frontend React app
  app.use(
    cors({
      origin: true, // Allow configured origins or incoming frontend requests
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount API routes
  app.use('/api', routes);

  // Catch unhandled API routes
  app.use('/api/*', (req: Request, res: Response) => {
    sendError(res, `API route ${req.method} ${req.originalUrl} not found`, 404);
  });

  // Global error handler
  app.use(errorHandler);

  return app;
}
