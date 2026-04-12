import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { AdminController } from "./admin.controller";

const router = Router();
const controller = new AdminController();

router.use(authMiddleware);
router.use(requireRole("admin"));

router.get("/metrics", asyncHandler(controller.metrics));

export default router;

