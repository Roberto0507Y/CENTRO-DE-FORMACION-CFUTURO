"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = optionalAuthMiddleware;
const httpErrors_1 = require("../common/errors/httpErrors");
const authToken_1 = require("./authToken");
function wantsExplicitBearerTransport(authTransport) {
    const requestedTransport = String(authTransport || "").trim().toLowerCase();
    return requestedTransport === "bearer" || requestedTransport === "cookie+bearer";
}
function optionalAuthMiddleware(req, _res, next) {
    const header = req.headers.authorization;
    const cookie = req.headers.cookie;
    const authTransport = typeof req.headers["x-auth-transport"] === "string" ? req.headers["x-auth-transport"] : undefined;
    if (!header && !cookie)
        return next();
    if (header && !header.startsWith("Bearer "))
        return next((0, httpErrors_1.unauthorized)("Token Bearer requerido"));
    if (header && !wantsExplicitBearerTransport(authTransport)) {
        return next((0, httpErrors_1.unauthorized)("X-Auth-Transport: bearer requerido"));
    }
    void (0, authToken_1.resolveAuthContext)({
        authorization: header,
        cookie,
        authTransport,
    })
        .then((auth) => {
        req.auth = auth;
        next();
    })
        .catch((err) => next(err));
}
