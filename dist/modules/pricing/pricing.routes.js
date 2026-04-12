"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../common/utils/asyncHandler");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const pricing_controller_1 = require("./pricing.controller");
const pricing_schema_1 = require("./pricing.schema");
const router = (0, express_1.Router)();
const controller = new pricing_controller_1.PricingController();
router.use(auth_middleware_1.authMiddleware);
// Lectura: admin y docente (para seleccionar un botón de precio al crear/editar cursos)
router.get("/", (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ query: pricing_schema_1.listPricingQuerySchema }), (0, asyncHandler_1.asyncHandler)(controller.list));
router.get("/:id", (0, role_middleware_1.requireRole)("admin", "docente"), (0, validate_middleware_1.validate)({ params: pricing_schema_1.pricingIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.getById));
// Escritura: solo admin
router.post("/", (0, role_middleware_1.requireRole)("admin"), (0, validate_middleware_1.validate)({ body: pricing_schema_1.createPricingBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.create));
router.put("/:id", (0, role_middleware_1.requireRole)("admin"), (0, validate_middleware_1.validate)({ params: pricing_schema_1.pricingIdParamsSchema, body: pricing_schema_1.updatePricingBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.update));
router.patch("/:id/status", (0, role_middleware_1.requireRole)("admin"), (0, validate_middleware_1.validate)({ params: pricing_schema_1.pricingIdParamsSchema, body: pricing_schema_1.patchPricingStatusBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.patchStatus));
exports.default = router;
