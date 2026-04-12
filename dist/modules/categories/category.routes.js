"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../common/utils/asyncHandler");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const optionalAuth_middleware_1 = require("../../middlewares/optionalAuth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const category_controller_1 = require("./category.controller");
const category_schema_1 = require("./category.schema");
const router = (0, express_1.Router)();
const controller = new category_controller_1.CategoryController();
// Públicos: solo categorías activas
router.get("/", optionalAuth_middleware_1.optionalAuthMiddleware, (0, validate_middleware_1.validate)({ query: category_schema_1.listCategoriesQuerySchema }), (0, asyncHandler_1.asyncHandler)(controller.list));
router.get("/:id", optionalAuth_middleware_1.optionalAuthMiddleware, (0, validate_middleware_1.validate)({ params: category_schema_1.categoryIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.getById));
// Admin
router.post("/", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("admin"), (0, validate_middleware_1.validate)({ body: category_schema_1.createCategoryBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.create));
router.put("/:id", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("admin"), (0, validate_middleware_1.validate)({ params: category_schema_1.categoryIdParamsSchema, body: category_schema_1.updateCategoryBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.update));
router.patch("/:id/status", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("admin"), (0, validate_middleware_1.validate)({ params: category_schema_1.categoryIdParamsSchema, body: category_schema_1.patchCategoryStatusBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.patchStatus));
router.delete("/:id", auth_middleware_1.authMiddleware, (0, role_middleware_1.requireRole)("admin"), (0, validate_middleware_1.validate)({ params: category_schema_1.categoryIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.remove));
exports.default = router;
