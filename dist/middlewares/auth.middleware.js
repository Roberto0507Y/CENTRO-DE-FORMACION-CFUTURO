"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const authToken_1 = require("./authToken");
function authMiddleware(req, _res, next) {
    void (0, authToken_1.resolveAuthContext)({
        authorization: req.headers.authorization,
        cookie: req.headers.cookie,
        authTransport: typeof req.headers["x-auth-transport"] === "string" ? req.headers["x-auth-transport"] : undefined,
    })
        .then((auth) => {
        req.auth = auth;
        next();
    })
        .catch((err) => next(err));
}
