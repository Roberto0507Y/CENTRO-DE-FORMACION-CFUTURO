import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { ForumController } from "./forum.controller";
import {
  courseIdParamsSchema,
  createReplyBodySchema,
  createTopicBodySchema,
  patchReplyStatusBodySchema,
  patchTopicBodySchema,
  replyIdParamsSchema,
  topicIdParamsSchema,
} from "./forum.schema";

const router = Router({ mergeParams: true });
const controller = new ForumController();

router.use(authMiddleware);

router.get("/topics", validate({ params: courseIdParamsSchema }), asyncHandler(controller.listTopics));
router.post(
  "/topics",
  requireRole("admin", "docente"),
  validate({ params: courseIdParamsSchema, body: createTopicBodySchema }),
  asyncHandler(controller.createTopic)
);
router.get("/topics/:topicId", validate({ params: topicIdParamsSchema }), asyncHandler(controller.getTopic));
router.post(
  "/topics/:topicId/replies",
  validate({ params: topicIdParamsSchema, body: createReplyBodySchema }),
  asyncHandler(controller.replyToTopic)
);

// Moderación (admin/docente owner validado en service)
router.patch(
  "/topics/:topicId",
  requireRole("admin", "docente"),
  validate({ params: topicIdParamsSchema, body: patchTopicBodySchema }),
  asyncHandler(controller.patchTopic)
);
router.patch(
  "/topics/:topicId/replies/:replyId/status",
  requireRole("admin", "docente"),
  validate({ params: replyIdParamsSchema, body: patchReplyStatusBodySchema }),
  asyncHandler(controller.patchReplyStatus)
);

export default router;
