"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const authToken_1 = require("./authToken");
function authMiddleware(req, _res, next) {
    void (0, authToken_1.resolveAuthContextFromBearer)(req.headers.authorization)
        .then((auth) => {
        req.auth = auth;
        next();
    })
        .catch((err) => next(err));
}
