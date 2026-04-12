import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { optionalAuthMiddleware } from "../../middlewares/optionalAuth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { CategoryController } from "./category.controller";
import {
  categoryIdParamsSchema,
  createCategoryBodySchema,
  listCategoriesQuerySchema,
  patchCategoryStatusBodySchema,
  updateCategoryBodySchema,
} from "./category.schema";

const router = Router();
const controller = new CategoryController();

// Públicos: solo categorías activas
router.get("/", optionalAuthMiddleware, validate({ query: listCategoriesQuerySchema }), asyncHandler(controller.list));
router.get(
  "/:id",
  optionalAuthMiddleware,
  validate({ params: categoryIdParamsSchema }),
  asyncHandler(controller.getById)
);

// Admin
router.post(
  "/",
  authMiddleware,
  requireRole("admin"),
  validate({ body: createCategoryBodySchema }),
  asyncHandler(controller.create)
);
router.put(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  validate({ params: categoryIdParamsSchema, body: updateCategoryBodySchema }),
  asyncHandler(controller.update)
);
router.patch(
  "/:id/status",
  authMiddleware,
  requireRole("admin"),
  validate({ params: categoryIdParamsSchema, body: patchCategoryStatusBodySchema }),
  asyncHandler(controller.patchStatus)
);
router.delete(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  validate({ params: categoryIdParamsSchema }),
  asyncHandler(controller.remove)
);

export default router;
