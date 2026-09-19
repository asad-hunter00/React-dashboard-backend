import { Router } from 'express';
import { CalendarController } from '../controllers/calendar.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Protected routes
router.use(requireAuth);

router.get('/day', CalendarController.getTasksByDay);
router.get('/week', CalendarController.getTasksByWeek);
router.get('/month', CalendarController.getTasksByMonth);
router.get('/due-date', CalendarController.getTasksByDueDate);

export default router;
