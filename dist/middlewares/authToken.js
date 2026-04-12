"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAuthContextFromBearer = resolveAuthContextFromBearer;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const env_1 = require("../config/env");
const httpErrors_1 = require("../common/errors/httpErrors");
const auth_repository_1 = require("../modules/auth/auth.repository");
const payloadSchema = zod_1.z.object({
    sub: zod_1.z.string().min(1),
});
const authRepo = new auth_repository_1.AuthRepository();
async function resolveAuthContextFromBearer(header) {
    if (!header?.startsWith("Bearer ")) {
        throw (0, httpErrors_1.unauthorized)("Token Bearer requerido");
    }
    const token = header.slice("Bearer ".length).trim();
    let userId;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET, { algorithms: ["HS256"] });
        const payload = payloadSchema.parse(decoded);
        userId = Number(payload.sub);
    }
    catch {
        throw (0, httpErrors_1.unauthorized)("Token inválido o expirado");
    }
    if (!Number.isFinite(userId)) {
        throw (0, httpErrors_1.unauthorized)("Token inválido");
    }
    const user = await authRepo.findPublicById(userId);
    if (!user) {
        throw (0, httpErrors_1.unauthorized)("Usuario no encontrado");
    }
    if (user.estado !== "activo") {
        throw (0, httpErrors_1.forbidden)("Tu usuario no está activo");
    }
    return { userId: user.id, role: user.rol };
}
