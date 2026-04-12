"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../common/utils/asyncHandler");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const optionalAuth_middleware_1 = require("../../middlewares/optionalAuth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const course_controller_1 = require("./course.controller");
const announcement_routes_1 = __importDefault(require("../announcements/announcement.routes"));
const attendance_routes_1 = __importDefault(require("../attendance/attendance.routes"));
const material_routes_1 = __importDefault(require("../materials/material.routes"));
const forum_routes_1 = __importDefault(require("../forums/forum.routes"));
const quiz_routes_1 = __importDefault(require("../quizzes/quiz.routes"));
const gradebook_routes_1 = __importDefault(require("../gradebook/gradebook.routes"));
const course_schema_1 = require("./course.schema");
const router = (0, express_1.Router)();
const controller = new course_controller_1.CourseController();
// Públicos
router.get("/", (0, validate_middleware_1.validate)({ query: course_schema_1.courseListQuerySchema }), (0, asyncHandler_1.asyncHandler)(controller.list));
router.get("/slug/:slug", (0, validate_middleware_1.validate)({ params: course_schema_1.courseSlugParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.getBySlug));
// Anuncios del curso (auth requerido dentro del router de anuncios)
router.use("/:courseId/announcements", announcement_routes_1.default);
// Asistencia del curso (solo admin/docente)
router.use("/:courseId/attendance", attendance_routes_1.default);
// Calificaciones/asistencia del estudiante
router.use("/:courseId/grades", gradebook_routes_1.default);
// Quizzes del curso (admin/docente/stud según reglas internas)
router.use("/:courseId/quizzes", quiz_routes_1.default);
// Materiales del curso (admin/docente/stud según reglas internas)
router.use("/:courseId/materials", material_routes_1.default);
// Foro del curso (admin/docente/estudiante con acceso)
router.use("/:courseId/forum", forum_routes_1.default);
// Rutas "my"
router.get("/my/teaching", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ query: course_schema_1.teachingListQuerySchema }), (0, asyncHandler_1.asyncHandler)(controller.myTeaching));
router.get("/my/enrolled", auth_middleware_1.authMiddleware, (0, asyncHandler_1.asyncHandler)(controller.myEnrolled));
// Detalle por id (público, pero permite ver borrador/oculto si eres admin o dueño)
router.get("/:id", optionalAuth_middleware_1.optionalAuthMiddleware, (0, validate_middleware_1.validate)({ params: course_schema_1.courseIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.getById));
// Admin / Docente
router.post("/", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ body: course_schema_1.createCourseBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.create));
router.put("/:id", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: course_schema_1.courseIdParamsSchema, body: course_schema_1.updateCourseBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.update));
router.delete("/:id", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: course_schema_1.courseIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.remove));
exports.default = router;
