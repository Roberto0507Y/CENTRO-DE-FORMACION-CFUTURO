"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../common/utils/asyncHandler");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const payment_controller_1 = require("./payment.controller");
const payment_schema_1 = require("./payment.schema");
const upload_middleware_1 = require("../../middlewares/upload.middleware");
const storage_service_1 = require("../../common/services/storage.service");
const rateLimit_middleware_1 = require("../../middlewares/rateLimit.middleware");
const router = (0, express_1.Router)();
const controller = new payment_controller_1.PaymentController();
const paymentProofUploadRateLimit = (0, rateLimit_middleware_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 12,
    keyPrefix: "payments:proof",
    message: "Demasiados comprobantes enviados. Intenta nuevamente en unos minutos.",
});
router.use(auth_middleware_1.authMiddleware);
// Usuario autenticado: ver estado de pago por curso y enviar comprobante (pago manual)
router.get("/my/courses", (0, asyncHandler_1.asyncHandler)(controller.myCoursesPayments));
router.get("/my/course/:courseId", (0, validate_middleware_1.validate)({ params: payment_schema_1.courseIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.myCoursePayment));
router.get("/my/course/:courseId/history", (0, validate_middleware_1.validate)({ params: payment_schema_1.courseIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.myCoursePaymentHistory));
router.post("/manual/course/:courseId", paymentProofUploadRateLimit, (0, upload_middleware_1.optionalUploadSingle)({
    fieldName: "file",
    allowed: storage_service_1.ALLOWED_PAYMENT_PROOFS,
    required: true,
}), (0, validate_middleware_1.validate)({ params: payment_schema_1.courseIdParamsSchema, body: payment_schema_1.manualPaymentBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.createManualCoursePayment));
router.get("/:id/proof/download", (0, validate_middleware_1.validate)({ params: payment_schema_1.paymentIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.downloadProof));
// Admin
router.use((0, role_middleware_1.requireRole)("admin"));
router.get("/summary", (0, asyncHandler_1.asyncHandler)(controller.summary));
router.get("/reports/revenue", (0, validate_middleware_1.validate)({ query: payment_schema_1.revenueQuerySchema }), (0, asyncHandler_1.asyncHandler)(controller.revenue));
router.get("/", (0, validate_middleware_1.validate)({ query: payment_schema_1.listPaymentsQuerySchema }), (0, asyncHandler_1.asyncHandler)(controller.list));
router.get("/:id", (0, validate_middleware_1.validate)({ params: payment_schema_1.paymentIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.getById));
router.put("/:id/status", (0, validate_middleware_1.validate)({ params: payment_schema_1.paymentIdParamsSchema, body: payment_schema_1.updatePaymentStatusBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.updateStatus));
exports.default = router;
