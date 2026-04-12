import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { ReportController } from "./report.controller";
import { zoneReportQuerySchema } from "./report.schema";

const router = Router();
const controller = new ReportController();

router.use(authMiddleware, requireRole("admin", "docente"));

router.get(
  "/zone",
  validate({ query: zoneReportQuerySchema }),
  asyncHandler(controller.zone)
);

export default router;
