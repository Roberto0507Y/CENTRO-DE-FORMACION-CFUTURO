"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const cookies_1 = require("../../common/utils/cookies");
const auth_session_1 = require("./auth-session");
const csrf_1 = require("./csrf");
const auth_service_1 = require("./auth.service");
function wantsBearerResponse(req) {
    const requestedTransport = String(req.headers["x-auth-transport"] || "")
        .trim()
        .toLowerCase();
    return requestedTransport === "bearer" || requestedTransport === "cookie+bearer";
}
function buildWebAuthResponse(result, csrfToken) {
    return {
        user: result.user,
        session: {
            authenticated: true,
            transport: "cookie",
            csrfToken,
        },
    };
}
function buildBearerAuthResponse(result) {
    return {
        user: result.user,
        token: result.token,
    };
}
class AuthController {
    constructor() {
        this.service = new auth_service_1.AuthService();
        this.csrf = async (req, res) => {
            const currentCsrfToken = (0, cookies_1.readCookieValue)(req.headers.cookie, csrf_1.CSRF_COOKIE_NAME);
            const csrfToken = (0, csrf_1.issueCsrfToken)(res, currentCsrfToken);
            res.status(200).json({ ok: true, data: { csrfToken } });
        };
        this.register = async (req, res) => {
            const result = await this.service.register(req.body);
            const wantsBearer = wantsBearerResponse(req);
            if (wantsBearer) {
                res.status(201).json({ ok: true, data: buildBearerAuthResponse(result) });
                return;
            }
            (0, auth_session_1.setAuthSessionCookie)(res, result.token);
            const csrfToken = (0, csrf_1.rotateCsrfToken)(res);
            res.status(201).json({ ok: true, data: buildWebAuthResponse(result, csrfToken) });
        };
        this.login = async (req, res) => {
            const result = await this.service.login(req.body);
            const wantsBearer = wantsBearerResponse(req);
            if (wantsBearer) {
                res.status(200).json({ ok: true, data: buildBearerAuthResponse(result) });
                return;
            }
            (0, auth_session_1.setAuthSessionCookie)(res, result.token);
            const csrfToken = (0, csrf_1.rotateCsrfToken)(res);
            res.status(200).json({ ok: true, data: buildWebAuthResponse(result, csrfToken) });
        };
        this.logout = async (_req, res) => {
            (0, auth_session_1.clearAuthSessionCookie)(res);
            (0, csrf_1.clearCsrfToken)(res);
            res.status(200).json({ ok: true, data: { ok: true } });
        };
        this.me = async (req, res) => {
            const result = await this.service.me(req.auth.userId);
            res.status(200).json({ ok: true, data: result });
        };
        this.forgotPassword = async (req, res) => {
            await this.service.forgotPassword(req.body);
            res.status(200).json({
                ok: true,
                data: { ok: true },
                message: "Si el correo existe, te enviaremos instrucciones para recuperar tu contraseña.",
            });
        };
        this.resetPassword = async (req, res) => {
            await this.service.resetPassword(req.body);
            res.status(200).json({ ok: true, data: { ok: true } });
        };
    }
}
exports.AuthController = AuthController;
