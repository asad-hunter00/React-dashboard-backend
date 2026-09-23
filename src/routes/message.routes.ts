import { Router } from "express";

import { MessageController } from "../controllers/message.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.put("/:id", MessageController.update);

router.delete("/:id", MessageController.delete);

export default router;