import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { AttendanceController } from "./attendance.controller";
import { attendanceQuerySchema, courseIdParamsSchema, upsertAttendanceBodySchema } from "./attendance.schema";

const router = Router({ mergeParams: true });
const controller = new AttendanceController();

router.use(authMiddleware, requireRole("admin", "docente"));

router.get(
  "/",
  validate({ params: courseIdParamsSchema, query: attendanceQuerySchema }),
  asyncHandler(controller.list)
);

router.post(
  "/",
  validate({ params: courseIdParamsSchema, body: upsertAttendanceBodySchema }),
  asyncHandler(controller.upsert)
);

export default router;

