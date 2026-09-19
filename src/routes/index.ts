import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import projectRoutes from './project.routes.js';
import taskRoutes from './task.routes.js';
import calendarRoutes from './calendar.routes.js';
import channelRoutes from './channel.routes.js';
import messageRoutes from './message.routes.js';
import teamRoutes from './team.routes.js';
import notificationRoutes from './notification.routes.js';
import activityRoutes from './activity.routes.js';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Taskflow Backend API is healthy and operational',
    timestamp: new Date().toISOString(),
  });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/calendar', calendarRoutes);
router.use('/channels', channelRoutes);
router.use('/messages', messageRoutes);
router.use('/team', teamRoutes);
router.use('/notifications', notificationRoutes);
router.use('/activities', activityRoutes);

export default router;
