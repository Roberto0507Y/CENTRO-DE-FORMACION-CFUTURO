"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../common/utils/asyncHandler");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const upload_middleware_1 = require("../../middlewares/upload.middleware");
const rateLimit_middleware_1 = require("../../middlewares/rateLimit.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const storage_service_1 = require("../../common/services/storage.service");
const task_controller_1 = require("./task.controller");
const task_schema_1 = require("./task.schema");
const router = (0, express_1.Router)();
const controller = new task_controller_1.TaskController();
const taskUploadRateLimit = (0, rateLimit_middleware_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    keyPrefix: "tasks:upload",
    message: "Demasiadas subidas de tareas. Intenta nuevamente en unos minutos.",
});
router.use(auth_middleware_1.authMiddleware);
router.get("/course/:courseId", (0, validate_middleware_1.validate)({ params: task_schema_1.courseIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.listByCourse));
router.get("/:id", (0, validate_middleware_1.validate)({ params: task_schema_1.taskIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.getById));
router.post("/course/:courseId", (0, role_middleware_1.requireRole)("admin", "docente"), taskUploadRateLimit, (0, upload_middleware_1.optionalUploadSingle)({ fieldName: "file", allowed: storage_service_1.ALLOWED_TASK_FILES, required: false }), (0, validate_middleware_1.validate)({ params: task_schema_1.courseIdParamsSchema, body: task_schema_1.createTaskBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.create));
router.put("/:id", (0, role_middleware_1.requireRole)("admin", "docente"), taskUploadRateLimit, (0, upload_middleware_1.optionalUploadSingle)({ fieldName: "file", allowed: storage_service_1.ALLOWED_TASK_FILES, required: false }), (0, validate_middleware_1.validate)({ params: task_schema_1.taskIdParamsSchema, body: task_schema_1.updateTaskBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.update));
router.delete("/:id", (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: task_schema_1.taskIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.close));
// Entregas (estudiante)
router.post("/:taskId/submissions", (0, role_middleware_1.requireRole)("estudiante"), taskUploadRateLimit, (0, upload_middleware_1.optionalUploadSingle)({ fieldName: "file", allowed: storage_service_1.ALLOWED_TASK_FILES, required: false }), (0, validate_middleware_1.validate)({ params: task_schema_1.submissionTaskIdParamsSchema, body: task_schema_1.createSubmissionBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.submitMyWork));
router.get("/:taskId/submissions/my", (0, role_middleware_1.requireRole)("estudiante"), (0, validate_middleware_1.validate)({ params: task_schema_1.submissionTaskIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.getMySubmission));
// Entregas (docente/admin)
router.get("/:taskId/submissions", (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: task_schema_1.submissionTaskIdParamsSchema, query: task_schema_1.listSubmissionsQuerySchema }), (0, asyncHandler_1.asyncHandler)(controller.listSubmissions));
router.put("/:taskId/submissions/:submissionId/grade", (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: task_schema_1.gradeSubmissionParamsSchema, body: task_schema_1.gradeSubmissionBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.gradeSubmission));
exports.default = router;
