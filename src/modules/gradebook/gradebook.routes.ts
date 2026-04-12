import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { GradebookController } from "./gradebook.controller";
import { courseIdParamsSchema } from "./gradebook.schema";

const router = Router({ mergeParams: true });
const controller = new GradebookController();

router.use(authMiddleware, requireRole("estudiante"));

router.get(
  "/my",
  validate({ params: courseIdParamsSchema }),
  asyncHandler(controller.myCourse)
);

export default router;
