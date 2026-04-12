"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../common/utils/asyncHandler");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const upload_middleware_1 = require("../../middlewares/upload.middleware");
const storage_service_1 = require("../../common/services/storage.service");
const uploads_controller_1 = require("./uploads.controller");
const rateLimit_middleware_1 = require("../../middlewares/rateLimit.middleware");
const router = (0, express_1.Router)();
const controller = new uploads_controller_1.UploadsController();
const uploadRateLimit = (0, rateLimit_middleware_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    keyPrefix: "uploads",
    message: "Demasiadas subidas de archivos. Intenta nuevamente en unos minutos.",
});
// Subida de imagen para cursos (guarda solo URL/key en DB)
router.post("/course-image", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("admin", "docente"), uploadRateLimit, (0, upload_middleware_1.optionalUploadSingle)({
    fieldName: "file",
    allowed: storage_service_1.ALLOWED_IMAGES,
    required: true,
}), (0, asyncHandler_1.asyncHandler)(controller.uploadCourseImage));
// Subida de imagen para categorías (admin)
router.post("/category-image", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("admin"), uploadRateLimit, (0, upload_middleware_1.optionalUploadSingle)({
    fieldName: "file",
    allowed: storage_service_1.ALLOWED_IMAGES,
    required: true,
}), (0, asyncHandler_1.asyncHandler)(controller.uploadCategoryImage));
exports.default = router;
