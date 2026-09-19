import { Router } from 'express';
import { ChannelController } from '../controllers/channel.controller.js';
import { MessageController } from '../controllers/message.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createChannelSchema,
  addChannelMemberSchema,
  sendMessageSchema,
} from '../validators/channel.validator.js';

const router = Router();

// Protected routes
router.use(requireAuth);

router.post('/', validate(createChannelSchema), ChannelController.create);
router.get('/', ChannelController.getAll);
router.get('/:id', ChannelController.getById);
router.post('/:id/members', validate(addChannelMemberSchema), ChannelController.addMember);
router.delete('/:id/members/:userId', ChannelController.removeMember);

// Messages nested under channels
router.post('/:channelId/messages', validate(sendMessageSchema), MessageController.send);
router.get('/:channelId/messages', MessageController.getByChannel);

export default router;
