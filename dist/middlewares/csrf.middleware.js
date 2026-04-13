"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfProtection = csrfProtection;
const httpErrors_1 = require("../common/errors/httpErrors");
const cookies_1 = require("../common/utils/cookies");
const csrf_1 = require("../modules/auth/csrf");
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
function readCsrfHeader(req) {
    const raw = req.headers[csrf_1.CSRF_HEADER_NAME];
    if (Array.isArray(raw))
        return raw[0] || null;
    return typeof raw === "string" ? raw.trim() || null : null;
}
function isBearerApiRequest(req) {
    const requestedTransport = String(req.headers["x-auth-transport"] || "")
        .trim()
        .toLowerCase();
    return requestedTransport === "bearer" || requestedTransport === "cookie+bearer";
}
function csrfProtection(req, _res, next) {
    if (SAFE_METHODS.has(req.method.toUpperCase())) {
        next();
        return;
    }
    if (isBearerApiRequest(req)) {
        next();
        return;
    }
    const csrfCookie = (0, cookies_1.readCookieValue)(req.headers.cookie, csrf_1.CSRF_COOKIE_NAME);
    const csrfHeader = readCsrfHeader(req);
    if (!csrfCookie || !csrfHeader) {
        next((0, httpErrors_1.forbidden)("Token CSRF inválido o ausente"));
        return;
    }
    if (csrfCookie !== csrfHeader || !(0, csrf_1.isValidCsrfToken)(csrfCookie)) {
        next((0, httpErrors_1.forbidden)("Token CSRF inválido o ausente"));
        return;
    }
    next();
}
