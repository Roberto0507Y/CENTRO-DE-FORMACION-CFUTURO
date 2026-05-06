import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { rateLimit } from "../../middlewares/rateLimit.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { AssistantController } from "./assistant.controller";
import { assistantChatBodySchema } from "./assistant.schema";

const router = Router();
const controller = new AssistantController();

const bootstrapRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 40,
  keyPrefix: "assistant:bootstrap",
  message: "Demasiadas solicitudes al asistente. Intenta nuevamente en unos minutos.",
});

const chatRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 16,
  keyPrefix: "assistant:chat",
  message: "Has enviado demasiados mensajes al asistente. Intenta nuevamente en unos minutos.",
});

router.get("/bootstrap", bootstrapRateLimit, asyncHandler(controller.bootstrap));
router.post("/chat", chatRateLimit, validate({ body: assistantChatBodySchema }), asyncHandler(controller.chat));

export default router;
