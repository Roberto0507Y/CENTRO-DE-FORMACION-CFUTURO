import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { optionalUploadSingle } from "../../middlewares/upload.middleware";
import { ALLOWED_IMAGES } from "../../common/services/storage.service";
import { UploadsController } from "./uploads.controller";
import { rateLimit } from "../../middlewares/rateLimit.middleware";

const router = Router();
const controller = new UploadsController();
const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: "uploads",
  message: "Demasiadas subidas de archivos. Intenta nuevamente en unos minutos.",
});

// Subida de imagen para cursos (guarda solo URL/key en DB)
router.post(
  "/course-image",
  authMiddleware,
  requireRole("admin", "docente"),
  uploadRateLimit,
  optionalUploadSingle({
    fieldName: "file",
    allowed: ALLOWED_IMAGES,
    required: true,
  }),
  asyncHandler(controller.uploadCourseImage)
);

// Subida de imagen para categorías (admin)
router.post(
  "/category-image",
  authMiddleware,
  requireRole("admin"),
  uploadRateLimit,
  optionalUploadSingle({
    fieldName: "file",
    allowed: ALLOWED_IMAGES,
    required: true,
  }),
  asyncHandler(controller.uploadCategoryImage)
);

export default router;
