import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { optionalAuthMiddleware } from "../../middlewares/optionalAuth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { CourseModuleController } from "./courseModule.controller";
import { courseIdParamsSchema } from "./courseModule.schema";

const router = Router();
const controller = new CourseModuleController();

router.get(
  "/course/:courseId",
  optionalAuthMiddleware,
  validate({ params: courseIdParamsSchema }),
  asyncHandler(controller.listByCourse)
);

export default router;

