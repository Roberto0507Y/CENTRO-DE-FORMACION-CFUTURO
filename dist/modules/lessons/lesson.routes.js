"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../common/utils/asyncHandler");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const optionalAuth_middleware_1 = require("../../middlewares/optionalAuth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const upload_middleware_1 = require("../../middlewares/upload.middleware");
const rateLimit_middleware_1 = require("../../middlewares/rateLimit.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const storage_service_1 = require("../../common/services/storage.service");
const lesson_controller_1 = require("./lesson.controller");
const lesson_schema_1 = require("./lesson.schema");
const lessonUploadExtensions = Array.from(new Set([...(storage_service_1.ALLOWED_VIDEOS.allowedExtensions ?? []), ...(storage_service_1.ALLOWED_PDFS.allowedExtensions ?? [])]));
const router = (0, express_1.Router)();
const controller = new lesson_controller_1.LessonController();
const lessonUploadRateLimit = (0, rateLimit_middleware_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 25,
    keyPrefix: "lessons:upload",
    message: "Demasiadas subidas de lecciones. Intenta nuevamente en unos minutos.",
});
// Public/optional auth
router.get("/module/:moduleId", optionalAuth_middleware_1.optionalAuthMiddleware, (0, validate_middleware_1.validate)({ params: lesson_schema_1.moduleIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.listByModule));
router.get("/:id", optionalAuth_middleware_1.optionalAuthMiddleware, (0, validate_middleware_1.validate)({ params: lesson_schema_1.lessonIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.getById));
// Admin/Docente owner
router.post("/", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("admin", "docente"), lessonUploadRateLimit, 
// multipart/form-data opcional (archivo en memoria)
(0, upload_middleware_1.optionalUploadSingle)({
    fieldName: "file",
    allowed: {
        maxSizeBytes: Math.max(storage_service_1.ALLOWED_VIDEOS.maxSizeBytes, storage_service_1.ALLOWED_PDFS.maxSizeBytes),
        allowedMimeTypes: [...storage_service_1.ALLOWED_VIDEOS.allowedMimeTypes, ...storage_service_1.ALLOWED_PDFS.allowedMimeTypes],
        allowedExtensions: lessonUploadExtensions,
    },
    required: false,
}), (0, validate_middleware_1.validate)({ body: lesson_schema_1.createLessonBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.create));
router.put("/:id", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("admin", "docente"), lessonUploadRateLimit, (0, upload_middleware_1.optionalUploadSingle)({
    fieldName: "file",
    allowed: {
        maxSizeBytes: Math.max(storage_service_1.ALLOWED_VIDEOS.maxSizeBytes, storage_service_1.ALLOWED_PDFS.maxSizeBytes),
        allowedMimeTypes: [...storage_service_1.ALLOWED_VIDEOS.allowedMimeTypes, ...storage_service_1.ALLOWED_PDFS.allowedMimeTypes],
        allowedExtensions: lessonUploadExtensions,
    },
    required: false,
}), (0, validate_middleware_1.validate)({ params: lesson_schema_1.lessonIdParamsSchema, body: lesson_schema_1.updateLessonBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.update));
router.delete("/:id", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: lesson_schema_1.lessonIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.remove));
router.post("/:id/complete", auth_middleware_1.authMiddleware, (0, validate_middleware_1.validate)({ params: lesson_schema_1.lessonIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.complete));
exports.default = router;
