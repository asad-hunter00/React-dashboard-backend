import http from 'http';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './src/app.js';
import { config } from './src/config/env.js';
import { initSocketServer } from './src/services/socket.service.js';
import { DbService } from './src/services/db.service.js';
import { testPrismaConnection } from './src/config/prisma.js';

async function startServer() {
  const app = createApp();
  const server = http.createServer(app);

  // Initialize Socket.IO real-time server
  const io = initSocketServer(server);
  console.log('[Taskflow] Socket.IO real-time server initialized.');

  // Initialize database & default seeds
  try {
    if (config.databaseUrl) {
      await testPrismaConnection();
    } else {
      console.log('[Taskflow] No DATABASE_URL provided. Running with high-performance in-memory database store.');
    }

    await DbService.ensureDefaultChannel();
    console.log('[Taskflow] Default #general channel verified/seeded.');
  } catch (dbErr: any) {
    console.warn('[Taskflow] Database initialization warning:', dbErr.message || dbErr);
  }

  // Vite integration: serve static assets/fallback in development and production
  // API routes are already mounted in createApp() so they take precedence.
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = config.port || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Taskflow Backend] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[Taskflow Backend] REST API available at http://0.0.0.0:${PORT}/api`);
    console.log(`[Taskflow Backend] Socket.IO ready on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Taskflow] Fatal error starting server:', err);
  process.exit(1);
});
