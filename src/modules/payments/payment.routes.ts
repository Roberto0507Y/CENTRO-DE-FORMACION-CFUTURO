import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { PaymentController } from "./payment.controller";
import {
  courseIdParamsSchema,
  listPaymentsQuerySchema,
  manualPaymentBodySchema,
  paymentIdParamsSchema,
  revenueQuerySchema,
  updatePaymentStatusBodySchema,
} from "./payment.schema";
import { optionalUploadSingle } from "../../middlewares/upload.middleware";
import { ALLOWED_PAYMENT_PROOFS } from "../../common/services/storage.service";
import { rateLimit } from "../../middlewares/rateLimit.middleware";

const router = Router();
const controller = new PaymentController();
const paymentProofUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  keyPrefix: "payments:proof",
  message: "Demasiados comprobantes enviados. Intenta nuevamente en unos minutos.",
});

router.use(authMiddleware);

// Usuario autenticado: ver estado de pago por curso y enviar comprobante (pago manual)
router.get("/my/courses", asyncHandler(controller.myCoursesPayments));
router.get(
  "/my/course/:courseId",
  validate({ params: courseIdParamsSchema }),
  asyncHandler(controller.myCoursePayment)
);
router.get(
  "/my/course/:courseId/admission",
  validate({ params: courseIdParamsSchema }),
  asyncHandler(controller.myAdmissionPayment)
);
router.get(
  "/my/course/:courseId/history",
  validate({ params: courseIdParamsSchema }),
  asyncHandler(controller.myCoursePaymentHistory)
);
router.post(
  "/manual/course/:courseId",
  paymentProofUploadRateLimit,
  optionalUploadSingle({
    fieldName: "file",
    allowed: ALLOWED_PAYMENT_PROOFS,
    required: true,
  }),
  validate({ params: courseIdParamsSchema, body: manualPaymentBodySchema }),
  asyncHandler(controller.createManualCoursePayment)
);
router.post(
  "/manual/course/:courseId/admission",
  paymentProofUploadRateLimit,
  optionalUploadSingle({
    fieldName: "file",
    allowed: ALLOWED_PAYMENT_PROOFS,
    required: true,
  }),
  validate({ params: courseIdParamsSchema, body: manualPaymentBodySchema }),
  asyncHandler(controller.createManualAdmissionPayment)
);
router.get(
  "/:id/proof/download",
  validate({ params: paymentIdParamsSchema }),
  asyncHandler(controller.downloadProof)
);

// Admin
router.use(requireRole("admin"));
router.get("/summary", asyncHandler(controller.summary));
router.get("/reports/revenue", validate({ query: revenueQuerySchema }), asyncHandler(controller.revenue));

router.get("/", validate({ query: listPaymentsQuerySchema }), asyncHandler(controller.list));
router.get("/:id", validate({ params: paymentIdParamsSchema }), asyncHandler(controller.getById));
router.put(
  "/:id/status",
  validate({ params: paymentIdParamsSchema, body: updatePaymentStatusBodySchema }),
  asyncHandler(controller.updateStatus)
);

export default router;
