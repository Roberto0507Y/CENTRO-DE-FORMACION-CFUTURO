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
const authRegisterIpRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  keyPrefix: "auth:register:ip",
  message: "Demasiadas cuentas creadas desde este origen. Intenta nuevamente más tarde.",
});
const authRegisterEmailRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyPrefix: "auth:register:email",
  keyGenerator: (req) => {
    const correo = typeof req.body?.correo === "string" ? req.body.correo : "";
    return correo.toLowerCase().trim() || req.ip;
  },
  message: "Demasiados intentos para este correo. Intenta nuevamente más tarde.",
});

router.get("/csrf", asyncHandler(controller.csrf));
router.post(
  "/register",
  authRegisterIpRateLimit,
  validate({ body: registerBodySchema }),
  authRegisterEmailRateLimit,
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
