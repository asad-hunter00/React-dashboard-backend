import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { createProjectSchema, updateProjectSchema } from '../validators/project.validator.js';

const router = Router();

// Protected routes
router.use(requireAuth);

router.post('/', validate(createProjectSchema), ProjectController.create);
router.get('/', ProjectController.getAll);
router.get('/:id', ProjectController.getById);
router.put('/:id', validate(updateProjectSchema), ProjectController.update);
router.delete('/:id', ProjectController.delete);

export default router;
