"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
const httpErrors_1 = require("../common/errors/httpErrors");
function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.auth)
            return next((0, httpErrors_1.unauthorized)());
        if (!roles.includes(req.auth.role)) {
            return next((0, httpErrors_1.forbidden)("No tienes permisos para esta acción"));
        }
        next();
    };
}
