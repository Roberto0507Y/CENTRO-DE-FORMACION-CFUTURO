"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../common/utils/asyncHandler");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const upload_middleware_1 = require("../../middlewares/upload.middleware");
const rateLimit_middleware_1 = require("../../middlewares/rateLimit.middleware");
const storage_service_1 = require("../../common/services/storage.service");
const announcement_controller_1 = require("./announcement.controller");
const announcement_schema_1 = require("./announcement.schema");
const router = (0, express_1.Router)({ mergeParams: true });
const controller = new announcement_controller_1.AnnouncementController();
const announcementUploadRateLimit = (0, rateLimit_middleware_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    keyPrefix: "announcements:upload",
    message: "Demasiadas subidas de anuncios. Intenta nuevamente en unos minutos.",
});
router.use(auth_middleware_1.authMiddleware);
router.get("/", (0, validate_middleware_1.validate)({ params: announcement_schema_1.courseIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.list));
router.get("/:id", (0, validate_middleware_1.validate)({ params: announcement_schema_1.announcementIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.getById));
router.post("/", (0, role_middleware_1.requireRole)("admin", "docente"), announcementUploadRateLimit, (0, upload_middleware_1.optionalUploadSingle)({
    fieldName: "file",
    allowed: storage_service_1.ALLOWED_ANNOUNCEMENT_FILES,
    required: false,
}), (0, validate_middleware_1.validate)({ params: announcement_schema_1.courseIdParamsSchema, body: announcement_schema_1.createAnnouncementBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.create));
router.put("/:id", (0, role_middleware_1.requireRole)("admin", "docente"), announcementUploadRateLimit, (0, upload_middleware_1.optionalUploadSingle)({
    fieldName: "file",
    allowed: storage_service_1.ALLOWED_ANNOUNCEMENT_FILES,
    required: false,
}), (0, validate_middleware_1.validate)({ params: announcement_schema_1.announcementIdParamsSchema, body: announcement_schema_1.updateAnnouncementBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.update));
router.patch("/:id/status", (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: announcement_schema_1.announcementIdParamsSchema, body: announcement_schema_1.patchAnnouncementStatusBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.patchStatus));
exports.default = router;
