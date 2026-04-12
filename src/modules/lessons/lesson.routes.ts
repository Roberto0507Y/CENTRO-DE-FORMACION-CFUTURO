import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { optionalAuthMiddleware } from "../../middlewares/optionalAuth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { optionalUploadSingle } from "../../middlewares/upload.middleware";
import { rateLimit } from "../../middlewares/rateLimit.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { ALLOWED_PDFS, ALLOWED_VIDEOS } from "../../common/services/storage.service";
import { LessonController } from "./lesson.controller";
import {
  createLessonBodySchema,
  lessonIdParamsSchema,
  moduleIdParamsSchema,
  updateLessonBodySchema,
} from "./lesson.schema";

const lessonUploadExtensions = Array.from(
  new Set([...(ALLOWED_VIDEOS.allowedExtensions ?? []), ...(ALLOWED_PDFS.allowedExtensions ?? [])])
);

const router = Router();
const controller = new LessonController();
const lessonUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  keyPrefix: "lessons:upload",
  message: "Demasiadas subidas de lecciones. Intenta nuevamente en unos minutos.",
});

// Public/optional auth
router.get(
  "/module/:moduleId",
  optionalAuthMiddleware,
  validate({ params: moduleIdParamsSchema }),
  asyncHandler(controller.listByModule)
);

router.get(
  "/:id",
  optionalAuthMiddleware,
  validate({ params: lessonIdParamsSchema }),
  asyncHandler(controller.getById)
);

// Admin/Docente owner
router.post(
  "/",
  authMiddleware,
  requireRole("admin", "docente"),
  lessonUploadRateLimit,
  // multipart/form-data opcional (archivo en memoria)
  optionalUploadSingle({
    fieldName: "file",
    allowed: {
      maxSizeBytes: Math.max(ALLOWED_VIDEOS.maxSizeBytes, ALLOWED_PDFS.maxSizeBytes),
      allowedMimeTypes: [...ALLOWED_VIDEOS.allowedMimeTypes, ...ALLOWED_PDFS.allowedMimeTypes],
      allowedExtensions: lessonUploadExtensions,
    },
    required: false,
  }),
  validate({ body: createLessonBodySchema }),
  asyncHandler(controller.create)
);

router.put(
  "/:id",
  authMiddleware,
  requireRole("admin", "docente"),
  lessonUploadRateLimit,
  optionalUploadSingle({
    fieldName: "file",
    allowed: {
      maxSizeBytes: Math.max(ALLOWED_VIDEOS.maxSizeBytes, ALLOWED_PDFS.maxSizeBytes),
      allowedMimeTypes: [...ALLOWED_VIDEOS.allowedMimeTypes, ...ALLOWED_PDFS.allowedMimeTypes],
      allowedExtensions: lessonUploadExtensions,
    },
    required: false,
  }),
  validate({ params: lessonIdParamsSchema, body: updateLessonBodySchema }),
  asyncHandler(controller.update)
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole("admin", "docente"),
  validate({ params: lessonIdParamsSchema }),
  asyncHandler(controller.remove)
);

router.post(
  "/:id/complete",
  authMiddleware,
  validate({ params: lessonIdParamsSchema }),
  asyncHandler(controller.complete)
);

export default router;
