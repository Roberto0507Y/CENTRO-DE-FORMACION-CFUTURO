"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = optionalAuthMiddleware;
const httpErrors_1 = require("../common/errors/httpErrors");
const authToken_1 = require("./authToken");
function optionalAuthMiddleware(req, _res, next) {
    const header = req.headers.authorization;
    if (!header)
        return next();
    if (!header.startsWith("Bearer "))
        return next((0, httpErrors_1.unauthorized)("Token Bearer requerido"));
    void (0, authToken_1.resolveAuthContextFromBearer)(header)
        .then((auth) => {
        req.auth = auth;
        next();
    })
        .catch((err) => next(err));
}
