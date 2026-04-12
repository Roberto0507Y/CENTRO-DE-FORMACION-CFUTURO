"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
class AuthController {
    constructor() {
        this.service = new auth_service_1.AuthService();
        this.register = async (req, res) => {
            const result = await this.service.register(req.body);
            res.status(201).json({ ok: true, data: result });
        };
        this.login = async (req, res) => {
            const result = await this.service.login(req.body);
            res.status(200).json({ ok: true, data: result });
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
