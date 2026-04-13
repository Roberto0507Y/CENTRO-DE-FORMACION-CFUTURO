"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_COOKIE_NAME = void 0;
exports.setAuthSessionCookie = setAuthSessionCookie;
exports.clearAuthSessionCookie = clearAuthSessionCookie;
const env_1 = require("../../config/env");
exports.AUTH_COOKIE_NAME = "cfuturo_session";
function resolveCookieMaxAgeMs() {
    const raw = String(env_1.env.JWT_EXPIRES_IN || "").trim();
    if (!raw)
        return undefined;
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && numeric > 0) {
        return numeric * 1000;
    }
    const match = raw.match(/^(\d+)\s*(ms|s|m|h|d)$/i);
    if (!match)
        return undefined;
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = {
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };
    return value * multipliers[unit];
}
function buildCookieOptions() {
    return {
        httpOnly: true,
        secure: env_1.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api",
        maxAge: resolveCookieMaxAgeMs(),
    };
}
function setAuthSessionCookie(res, token) {
    res.cookie(exports.AUTH_COOKIE_NAME, token, buildCookieOptions());
}
function clearAuthSessionCookie(res) {
    res.clearCookie(exports.AUTH_COOKIE_NAME, buildCookieOptions());
}
