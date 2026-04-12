"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsersQuerySchema = exports.updateUserBodySchema = exports.userIdParamsSchema = void 0;
const zod_1 = require("zod");
exports.userIdParamsSchema = zod_1.z
    .object({
    id: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.updateUserBodySchema = zod_1.z
    .object({
    nombres: zod_1.z.string().min(1).max(100).optional(),
    apellidos: zod_1.z.string().min(1).max(100).optional(),
    telefono: zod_1.z.string().max(30).nullable().optional(),
    foto_url: zod_1.z.string().url().max(500).nullable().optional(),
    fecha_nacimiento: zod_1.z.string().max(10).nullable().optional(),
    direccion: zod_1.z.string().max(255).nullable().optional(),
    rol: zod_1.z.enum(["admin", "docente", "estudiante"]).optional(),
    estado: zod_1.z.enum(["activo", "inactivo", "suspendido"]).optional(),
})
    .strict();
exports.listUsersQuerySchema = zod_1.z
    .object({
    search: zod_1.z
        .preprocess((v) => {
        if (typeof v !== "string")
            return v;
        const trimmed = v.trim();
        return trimmed ? trimmed : undefined;
    }, zod_1.z.string().min(1).max(150))
        .optional(),
    limit: zod_1.z
        .preprocess((v) => (v === undefined ? 20 : Number(v)), zod_1.z.number().int().min(1).max(200))
        .optional(),
    offset: zod_1.z
        .preprocess((v) => (v === undefined ? 0 : Number(v)), zod_1.z.number().int().min(0))
        .optional(),
})
    .strict();
