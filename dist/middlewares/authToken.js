"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAuthContext = resolveAuthContext;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const env_1 = require("../config/env");
const httpErrors_1 = require("../common/errors/httpErrors");
const cookies_1 = require("../common/utils/cookies");
const auth_repository_1 = require("../modules/auth/auth.repository");
const auth_session_1 = require("../modules/auth/auth-session");
const auth_token_version_1 = require("../modules/auth/auth-token-version");
const payloadSchema = zod_1.z.object({
    sub: zod_1.z.string().min(1),
    role: zod_1.z.enum(["admin", "docente", "estudiante"]),
    pwdv: zod_1.z.string().min(1),
});
const authRepo = new auth_repository_1.AuthRepository();
function wantsExplicitBearerTransport(authTransport) {
    const requestedTransport = String(authTransport || "").trim().toLowerCase();
    return requestedTransport === "bearer" || requestedTransport === "cookie+bearer";
}
function extractAuthToken(headers) {
    const cookieToken = (0, cookies_1.readCookieValue)(headers.cookie, auth_session_1.AUTH_COOKIE_NAME);
    if (cookieToken) {
        return cookieToken;
    }
    if (wantsExplicitBearerTransport(headers.authTransport) && headers.authorization) {
        if (!headers.authorization.startsWith("Bearer ")) {
            throw (0, httpErrors_1.unauthorized)("Token Bearer requerido");
        }
        return headers.authorization.slice("Bearer ".length).trim() || null;
    }
    return null;
}
async function resolveAuthContext(headers) {
    const token = extractAuthToken(headers);
    if (!token) {
        throw (0, httpErrors_1.unauthorized)("Token Bearer requerido");
    }
    let userId;
    let payload;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET, { algorithms: ["HS256"] });
        payload = payloadSchema.parse(decoded);
        userId = Number(payload.sub);
    }
    catch {
        throw (0, httpErrors_1.unauthorized)("Token inválido o expirado");
    }
    if (!Number.isFinite(userId)) {
        throw (0, httpErrors_1.unauthorized)("Token inválido");
    }
    const user = await authRepo.findSessionStateById(userId);
    if (!user) {
        throw (0, httpErrors_1.unauthorized)("Usuario no encontrado");
    }
    if (user.estado !== "activo") {
        throw (0, httpErrors_1.forbidden)("Tu usuario no está activo");
    }
    if ((0, auth_token_version_1.buildPasswordTokenVersion)(user.password) !== payload.pwdv) {
        throw (0, httpErrors_1.unauthorized)("Token inválido o expirado");
    }
    return { userId: user.id, role: user.rol };
}
