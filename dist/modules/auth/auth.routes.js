"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../common/utils/asyncHandler");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const rateLimit_middleware_1 = require("../../middlewares/rateLimit.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const auth_controller_1 = require("./auth.controller");
const auth_schema_1 = require("./auth.schema");
const router = (0, express_1.Router)();
const controller = new auth_controller_1.AuthController();
const authLoginRateLimit = (0, rateLimit_middleware_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 8,
    keyPrefix: "auth:login",
    message: "Demasiados intentos de inicio de sesión. Intenta nuevamente en unos minutos.",
});
const authRecoveryRateLimit = (0, rateLimit_middleware_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyPrefix: "auth:recovery",
    message: "Demasiados intentos de recuperación. Intenta nuevamente en unos minutos.",
});
const authRegisterRateLimit = (0, rateLimit_middleware_1.rateLimit)({
    windowMs: 60 * 60 * 1000,
    max: 6,
    keyPrefix: "auth:register",
    message: "Demasiadas cuentas creadas desde este origen. Intenta nuevamente más tarde.",
});
router.post("/register", authRegisterRateLimit, (0, validate_middleware_1.validate)({ body: auth_schema_1.registerBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.register));
router.post("/login", authLoginRateLimit, (0, validate_middleware_1.validate)({ body: auth_schema_1.loginBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.login));
router.get("/me", auth_middleware_1.authMiddleware, (0, asyncHandler_1.asyncHandler)(controller.me));
router.post("/forgot-password", authRecoveryRateLimit, (0, validate_middleware_1.validate)({ body: auth_schema_1.forgotPasswordBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.forgotPassword));
router.post("/reset-password", authRecoveryRateLimit, (0, validate_middleware_1.validate)({ body: auth_schema_1.resetPasswordBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.resetPassword));
exports.default = router;
