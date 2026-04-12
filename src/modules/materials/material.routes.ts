import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { optionalUploadSingle } from "../../middlewares/upload.middleware";
import { rateLimit } from "../../middlewares/rateLimit.middleware";
import { ALLOWED_MATERIAL_FILES } from "../../common/services/storage.service";
import { MaterialController } from "./material.controller";
import {
  courseIdParamsSchema,
  createMaterialBodySchema,
  materialIdParamsSchema,
  patchMaterialStatusBodySchema,
  updateMaterialBodySchema,
} from "./material.schema";

const router = Router({ mergeParams: true });
const controller = new MaterialController();
const materialUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  keyPrefix: "materials:upload",
  message: "Demasiadas subidas de materiales. Intenta nuevamente en unos minutos.",
});

router.use(authMiddleware);

router.get("/", validate({ params: courseIdParamsSchema }), asyncHandler(controller.list));

router.post(
  "/",
  requireRole("admin", "docente"),
  materialUploadRateLimit,
  optionalUploadSingle({ fieldName: "file", allowed: ALLOWED_MATERIAL_FILES, required: false }),
  validate({ params: courseIdParamsSchema, body: createMaterialBodySchema }),
  asyncHandler(controller.create)
);

router.put(
  "/:id",
  requireRole("admin", "docente"),
  materialUploadRateLimit,
  optionalUploadSingle({ fieldName: "file", allowed: ALLOWED_MATERIAL_FILES, required: false }),
  validate({ params: materialIdParamsSchema, body: updateMaterialBodySchema }),
  asyncHandler(controller.update)
);

router.patch(
  "/:id/status",
  requireRole("admin", "docente"),
  validate({ params: materialIdParamsSchema, body: patchMaterialStatusBodySchema }),
  asyncHandler(controller.patchStatus)
);

export default router;
