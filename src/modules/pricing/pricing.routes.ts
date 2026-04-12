import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { PricingController } from "./pricing.controller";
import {
  createPricingBodySchema,
  listPricingQuerySchema,
  patchPricingStatusBodySchema,
  pricingIdParamsSchema,
  updatePricingBodySchema,
} from "./pricing.schema";

const router = Router();
const controller = new PricingController();

router.use(authMiddleware);

// Lectura: admin y docente (para seleccionar un botón de precio al crear/editar cursos)
router.get(
  "/",
  requireRole("admin", "docente"),
  validate({ query: listPricingQuerySchema }),
  asyncHandler(controller.list)
);
router.get(
  "/:id",
  requireRole("admin", "docente"),
  validate({ params: pricingIdParamsSchema }),
  asyncHandler(controller.getById)
);

// Escritura: solo admin
router.post("/", requireRole("admin"), validate({ body: createPricingBodySchema }), asyncHandler(controller.create));
router.put(
  "/:id",
  requireRole("admin"),
  validate({ params: pricingIdParamsSchema, body: updatePricingBodySchema }),
  asyncHandler(controller.update)
);
router.patch(
  "/:id/status",
  requireRole("admin"),
  validate({ params: pricingIdParamsSchema, body: patchPricingStatusBodySchema }),
  asyncHandler(controller.patchStatus)
);

export default router;
