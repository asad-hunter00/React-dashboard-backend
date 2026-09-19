import { Router } from 'express';
import { TaskController } from '../controllers/task.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  updateTaskPrioritySchema,
  assignTaskSchema,
} from '../validators/task.validator.js';

const router = Router();

// Protected routes
router.use(requireAuth);

router.post('/', validate(createTaskSchema), TaskController.create);
router.get('/', TaskController.getAll);
router.get('/:id', TaskController.getById);
router.put('/:id', validate(updateTaskSchema), TaskController.update);
router.delete('/:id', TaskController.delete);

// Specific Task operations
router.put('/:id/complete', TaskController.complete);
router.put('/:id/status', validate(updateTaskStatusSchema), TaskController.updateStatus);
router.put('/:id/priority', validate(updateTaskPrioritySchema), TaskController.updatePriority);
router.put('/:id/assign', validate(assignTaskSchema), TaskController.assign);

export default router;
