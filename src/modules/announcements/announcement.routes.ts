import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { optionalUploadSingle } from "../../middlewares/upload.middleware";
import { rateLimit } from "../../middlewares/rateLimit.middleware";
import { ALLOWED_ANNOUNCEMENT_FILES } from "../../common/services/storage.service";
import { AnnouncementController } from "./announcement.controller";
import {
  announcementIdParamsSchema,
  courseIdParamsSchema,
  createAnnouncementBodySchema,
  patchAnnouncementStatusBodySchema,
  updateAnnouncementBodySchema,
} from "./announcement.schema";

const router = Router({ mergeParams: true });
const controller = new AnnouncementController();
const announcementUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: "announcements:upload",
  message: "Demasiadas subidas de anuncios. Intenta nuevamente en unos minutos.",
});

router.use(authMiddleware);

router.get(
  "/",
  validate({ params: courseIdParamsSchema }),
  asyncHandler(controller.list)
);
router.get(
  "/:id",
  validate({ params: announcementIdParamsSchema }),
  asyncHandler(controller.getById)
);

router.post(
  "/",
  requireRole("admin", "docente"),
  announcementUploadRateLimit,
  optionalUploadSingle({
    fieldName: "file",
    allowed: ALLOWED_ANNOUNCEMENT_FILES,
    required: false,
  }),
  validate({ params: courseIdParamsSchema, body: createAnnouncementBodySchema }),
  asyncHandler(controller.create)
);

router.put(
  "/:id",
  requireRole("admin", "docente"),
  announcementUploadRateLimit,
  optionalUploadSingle({
    fieldName: "file",
    allowed: ALLOWED_ANNOUNCEMENT_FILES,
    required: false,
  }),
  validate({ params: announcementIdParamsSchema, body: updateAnnouncementBodySchema }),
  asyncHandler(controller.update)
);

router.patch(
  "/:id/status",
  requireRole("admin", "docente"),
  validate({ params: announcementIdParamsSchema, body: patchAnnouncementStatusBodySchema }),
  asyncHandler(controller.patchStatus)
);

export default router;
