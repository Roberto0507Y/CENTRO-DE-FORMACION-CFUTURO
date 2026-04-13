"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSRF_HEADER_NAME = exports.CSRF_COOKIE_NAME = void 0;
exports.generateCsrfToken = generateCsrfToken;
exports.isValidCsrfToken = isValidCsrfToken;
exports.issueCsrfToken = issueCsrfToken;
exports.rotateCsrfToken = rotateCsrfToken;
exports.clearCsrfToken = clearCsrfToken;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../../config/env");
exports.CSRF_COOKIE_NAME = "cfuturo_csrf";
exports.CSRF_HEADER_NAME = "x-csrf-token";
const DEFAULT_CSRF_TTL_MS = 12 * 60 * 60 * 1000;
const csrfSecret = env_1.env.CSRF_SECRET || env_1.env.JWT_SECRET;
function resolveCookieMaxAgeMs() {
    const raw = String(env_1.env.JWT_EXPIRES_IN || "").trim();
    if (!raw)
        return DEFAULT_CSRF_TTL_MS;
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && numeric > 0) {
        return numeric * 1000;
    }
    const match = raw.match(/^(\d+)\s*(ms|s|m|h|d)$/i);
    if (!match)
        return DEFAULT_CSRF_TTL_MS;
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
function signNonce(nonce) {
    return crypto_1.default.createHmac("sha256", csrfSecret).update(nonce).digest("base64url");
}
function generateCsrfToken() {
    const nonce = crypto_1.default.randomBytes(32).toString("base64url");
    return `${nonce}.${signNonce(nonce)}`;
}
function isValidCsrfToken(token) {
    const [nonce, signature, ...rest] = token.split(".");
    if (!nonce || !signature || rest.length > 0)
        return false;
    const expectedSignature = signNonce(nonce);
    const receivedBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    if (receivedBuffer.length !== expectedBuffer.length)
        return false;
    return crypto_1.default.timingSafeEqual(receivedBuffer, expectedBuffer);
}
function issueCsrfToken(res, currentToken) {
    const token = currentToken && isValidCsrfToken(currentToken) ? currentToken : generateCsrfToken();
    res.cookie(exports.CSRF_COOKIE_NAME, token, buildCookieOptions());
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return token;
}
function rotateCsrfToken(res) {
    const token = generateCsrfToken();
    res.cookie(exports.CSRF_COOKIE_NAME, token, buildCookieOptions());
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return token;
}
function clearCsrfToken(res) {
    res.clearCookie(exports.CSRF_COOKIE_NAME, buildCookieOptions());
}
