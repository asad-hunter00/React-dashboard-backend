import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  updateProfileSchema,
  changeEmailSchema,
  userChangePasswordSchema,
} from '../validators/auth.validator.js';

const router = Router();

// Protected routes
router.use(requireAuth);

router.get('/me', UserController.getCurrentUser);
router.put('/profile', validate(updateProfileSchema), UserController.updateProfile);
router.put('/email', validate(changeEmailSchema), UserController.changeEmail);
router.put('/password', validate(userChangePasswordSchema), UserController.changePassword);
router.put('/avatar', UserController.updateAvatar);
router.post('/logout', UserController.logout);

export default router;
