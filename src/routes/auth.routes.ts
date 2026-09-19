import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter.middleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), AuthController.register);
router.post('/login', authRateLimiter, validate(loginSchema), AuthController.login);
router.post('/forgot-password', passwordResetRateLimiter, validate(forgotPasswordSchema), AuthController.forgotPassword);
router.post('/verify-otp', authRateLimiter, validate(verifyOtpSchema), AuthController.verifyOtp);
router.post('/reset-password', passwordResetRateLimiter, validate(changePasswordSchema), AuthController.resetPassword);

export default router;
