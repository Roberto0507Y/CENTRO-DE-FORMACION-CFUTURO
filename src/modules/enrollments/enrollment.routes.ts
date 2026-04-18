import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { EnrollmentController } from "./enrollment.controller";
import { courseIdParamsSchema, enrollmentIdParamsSchema, progressBodySchema } from "./enrollment.schema";

const router = Router();
const controller = new EnrollmentController();

router.use(authMiddleware);

router.post(
  "/free/:courseId",
  validate({ params: courseIdParamsSchema }),
  asyncHandler(controller.enrollFree)
);

router.post(
  "/paid/:courseId/confirm",
  validate({ params: courseIdParamsSchema }),
  asyncHandler(controller.confirmPaid)
);

router.get("/my-courses", asyncHandler(controller.myCourses));

router.get(
  "/:courseId/check-access",
  validate({ params: courseIdParamsSchema }),
  asyncHandler(controller.checkAccess)
);

router.get(
  "/course/:courseId/students",
  requireRole("admin", "docente"),
  validate({ params: courseIdParamsSchema }),
  asyncHandler(controller.courseStudents)
);

// Temporal: solo admin/docente (en service se valida dueño del curso si es docente)
router.put(
  "/:id/progress",
  requireRole("admin", "docente"),
  validate({ params: enrollmentIdParamsSchema, body: progressBodySchema }),
  asyncHandler(controller.updateProgress)
);

router.put(
  "/:id/cancel",
  validate({ params: enrollmentIdParamsSchema }),
  asyncHandler(controller.cancel)
);

router.delete(
  "/:id",
  requireRole("admin", "docente"),
  validate({ params: enrollmentIdParamsSchema }),
  asyncHandler(controller.expel)
);

export default router;
