import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { optionalAuthMiddleware } from "../../middlewares/optionalAuth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { CourseController } from "./course.controller";
import announcementRoutes from "../announcements/announcement.routes";
import attendanceRoutes from "../attendance/attendance.routes";
import materialRoutes from "../materials/material.routes";
import forumRoutes from "../forums/forum.routes";
import quizRoutes from "../quizzes/quiz.routes";
import gradebookRoutes from "../gradebook/gradebook.routes";
import {
  courseIdParamsSchema,
  courseListQuerySchema,
  courseSlugParamsSchema,
  createCourseBodySchema,
  teachingListQuerySchema,
  updateCourseBodySchema,
} from "./course.schema";

const router = Router();
const controller = new CourseController();

// Públicos
router.get("/", validate({ query: courseListQuerySchema }), asyncHandler(controller.list));
router.get("/slug/:slug", validate({ params: courseSlugParamsSchema }), asyncHandler(controller.getBySlug));

// Anuncios del curso (auth requerido dentro del router de anuncios)
router.use("/:courseId/announcements", announcementRoutes);

// Asistencia del curso (solo admin/docente)
router.use("/:courseId/attendance", attendanceRoutes);

// Calificaciones/asistencia del estudiante
router.use("/:courseId/grades", gradebookRoutes);

// Quizzes del curso (admin/docente/stud según reglas internas)
router.use("/:courseId/quizzes", quizRoutes);

// Materiales del curso (admin/docente/stud según reglas internas)
router.use("/:courseId/materials", materialRoutes);

// Foro del curso (admin/docente/estudiante con acceso)
router.use("/:courseId/forum", forumRoutes);

// Rutas "my"
router.get(
  "/my/teaching",
  authMiddleware,
  requireRole("admin", "docente"),
  validate({ query: teachingListQuerySchema }),
  asyncHandler(controller.myTeaching)
);
router.get("/my/enrolled", authMiddleware, asyncHandler(controller.myEnrolled));

// Detalle por id (público, pero permite ver borrador/oculto si eres admin o dueño)
router.get(
  "/:id",
  optionalAuthMiddleware,
  validate({ params: courseIdParamsSchema }),
  asyncHandler(controller.getById)
);

// Admin / Docente
router.post(
  "/",
  authMiddleware,
  requireRole("admin", "docente"),
  validate({ body: createCourseBodySchema }),
  asyncHandler(controller.create)
);
router.put(
  "/:id",
  authMiddleware,
  requireRole("admin", "docente"),
  validate({ params: courseIdParamsSchema, body: updateCourseBodySchema }),
  asyncHandler(controller.update)
);
router.delete(
  "/:id",
  authMiddleware,
  requireRole("admin", "docente"),
  validate({ params: courseIdParamsSchema }),
  asyncHandler(controller.remove)
);

export default router;
