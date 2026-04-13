"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const asyncHandler_1 = require("../../common/utils/asyncHandler");
const httpErrors_1 = require("../../common/errors/httpErrors");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const validate_middleware_1 = require("../../middlewares/validate.middleware");
const user_controller_1 = require("./user.controller");
const user_schema_1 = require("./user.schema");
const router = (0, express_1.Router)();
const controller = new user_controller_1.UserController();
function requireSelfOrAdmin(req, _res, next) {
    const requestedId = Number(req.params.id);
    if (req.auth?.role === "admin" || req.auth?.userId === requestedId) {
        next();
        return;
    }
    next((0, httpErrors_1.forbidden)("No autorizado"));
}
router.use(auth_middleware_1.authMiddleware);
router.get("/", (0, role_middleware_1.requireRole)("admin"), (0, validate_middleware_1.validate)({ query: user_schema_1.listUsersQuerySchema }), (0, asyncHandler_1.asyncHandler)(controller.list));
router.get("/:id", requireSelfOrAdmin, (0, validate_middleware_1.validate)({ params: user_schema_1.userIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.getById));
router.put("/:id", requireSelfOrAdmin, (0, validate_middleware_1.validate)({ params: user_schema_1.userIdParamsSchema, body: user_schema_1.updateUserBodySchema }), (0, asyncHandler_1.asyncHandler)(controller.update));
router.delete("/:id", (0, role_middleware_1.requireRole)("admin"), (0, validate_middleware_1.validate)({ params: user_schema_1.userIdParamsSchema }), (0, asyncHandler_1.asyncHandler)(controller.delete));
exports.default = router;
