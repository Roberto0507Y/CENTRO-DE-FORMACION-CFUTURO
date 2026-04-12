import { Router } from "express";
import { asyncHandler } from "../common/utils/asyncHandler";
import { pingDb } from "../config/db";
import authRoutes from "../modules/auth/auth.routes";
import adminRoutes from "../modules/admin/admin.routes";
import categoryRoutes from "../modules/categories/category.routes";
import courseModuleRoutes from "../modules/course-modules/courseModule.routes";
import courseRoutes from "../modules/courses/course.routes";
import enrollmentRoutes from "../modules/enrollments/enrollment.routes";
import fileRoutes from "../modules/files/file.routes";
import lessonRoutes from "../modules/lessons/lesson.routes";
import notificationRoutes from "../modules/notifications/notification.routes";
import paymentRoutes from "../modules/payments/payment.routes";
import pricingRoutes from "../modules/pricing/pricing.routes";
import reportRoutes from "../modules/reports/report.routes";
import taskRoutes from "../modules/tasks/task.routes";
import uploadsRoutes from "../modules/uploads/uploads.routes";
import userRoutes from "../modules/users/user.routes";

const router = Router();

router.get(
  "/health/db",
  asyncHandler(async (_req, res) => {
    await pingDb();
    res.status(200).json({ ok: true, db: "up" });
  })
);

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/categories", categoryRoutes);
router.use("/course-modules", courseModuleRoutes);
router.use("/courses", courseRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/files", fileRoutes);
router.use("/lessons", lessonRoutes);
router.use("/notifications", notificationRoutes);
router.use("/payments", paymentRoutes);
router.use("/pricing-settings", pricingRoutes);
router.use("/reports", reportRoutes);
router.use("/tasks", taskRoutes);
router.use("/uploads", uploadsRoutes);
router.use("/users", userRoutes);

export default router;
