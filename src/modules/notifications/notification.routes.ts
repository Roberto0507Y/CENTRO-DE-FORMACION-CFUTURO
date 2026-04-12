import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { NotificationController } from "./notification.controller";
import { listNotificationsQuerySchema, notificationIdParamsSchema } from "./notification.schema";

const router = Router();
const controller = new NotificationController();

router.use(authMiddleware);

router.get("/", validate({ query: listNotificationsQuerySchema }), asyncHandler(controller.listMy));
router.patch("/:id/read", validate({ params: notificationIdParamsSchema }), asyncHandler(controller.markRead));
router.patch("/read-all", asyncHandler(controller.markAllRead));
router.delete("/:id", validate({ params: notificationIdParamsSchema }), asyncHandler(controller.remove));

export default router;
