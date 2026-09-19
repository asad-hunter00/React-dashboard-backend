import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Protected routes
router.use(requireAuth);

router.get('/', NotificationController.getAll);
router.put('/:id/read', NotificationController.markRead);
router.put('/read-all', NotificationController.markAllRead);
router.delete('/:id', NotificationController.delete);

export default router;
