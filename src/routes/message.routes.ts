import { Router } from 'express';
import { MessageController } from '../controllers/message.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Protected routes
router.use(requireAuth);

router.delete('/:id', MessageController.delete);

export default router;
