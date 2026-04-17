import { Router } from "express";
import { asyncHandler } from "../../common/utils/asyncHandler";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { rateLimit } from "../../middlewares/rateLimit.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { AuthController } from "./auth.controller";
import {
  forgotPasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetPasswordBodySchema,
  verifyEmailBodySchema,
} from "./auth.schema";

const router = Router();
const controller = new AuthController();
const authLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  keyPrefix: "auth:login",
  message: "Demasiados intentos de inicio de sesión. Intenta nuevamente en unos minutos.",
});
const authRecoveryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: "auth:recovery",
  message: "Demasiados intentos de recuperación. Intenta nuevamente en unos minutos.",
});
const authRegisterRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  keyPrefix: "auth:register",
  message: "Demasiadas cuentas creadas desde este origen. Intenta nuevamente más tarde.",
});

router.get("/csrf", asyncHandler(controller.csrf));
router.post(
  "/register",
  authRegisterRateLimit,
  validate({ body: registerBodySchema }),
  asyncHandler(controller.register)
);
router.post(
  "/login",
  authLoginRateLimit,
  validate({ body: loginBodySchema }),
  asyncHandler(controller.login)
);
router.post("/logout", asyncHandler(controller.logout));
router.get("/me", authMiddleware, asyncHandler(controller.me));

router.post(
  "/forgot-password",
  authRecoveryRateLimit,
  validate({ body: forgotPasswordBodySchema }),
  asyncHandler(controller.forgotPassword)
);
router.post(
  "/reset-password",
  authRecoveryRateLimit,
  validate({ body: resetPasswordBodySchema }),
  asyncHandler(controller.resetPassword)
);
router.post(
  "/verify-email",
  authRecoveryRateLimit,
  validate({ body: verifyEmailBodySchema }),
  asyncHandler(controller.verifyEmail)
);

export default router;
