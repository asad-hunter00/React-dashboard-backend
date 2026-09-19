import { Router } from 'express';
import { TeamController } from '../controllers/team.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { addTeamMemberSchema, changeRoleSchema } from '../validators/team.validator.js';

const router = Router();

// Protected routes
router.use(requireAuth);

router.get('/', TeamController.getMembers);
router.get('/members', TeamController.getMembers);
router.post('/members', validate(addTeamMemberSchema), TeamController.addMember);
router.delete('/members/:id', TeamController.removeMember);
router.put('/members/:id/role', validate(changeRoleSchema), TeamController.changeRole);

export default router;
