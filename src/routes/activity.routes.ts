import { Router } from 'express';
import { ActivityController } from '../controllers/activity.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Protected routes
router.use(requireAuth);

router.get('/', ActivityController.getAll);

export default router;
