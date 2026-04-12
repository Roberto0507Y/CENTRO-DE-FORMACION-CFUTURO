"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordBodySchema = exports.forgotPasswordBodySchema = exports.loginBodySchema = exports.registerBodySchema = void 0;
const zod_1 = require("zod");
exports.registerBodySchema = zod_1.z
    .object({
    nombres: zod_1.z.string().min(1, "nombres es requerido").max(100),
    apellidos: zod_1.z.string().min(1, "apellidos es requerido").max(100),
    correo: zod_1.z.string().email("correo inválido").max(255),
    password: zod_1.z.string().min(8, "password debe tener al menos 8 caracteres").max(255),
    telefono: zod_1.z.string().max(30).optional(),
    foto_url: zod_1.z.string().url().max(500).optional(),
    fecha_nacimiento: zod_1.z.string().max(10).optional(),
    direccion: zod_1.z.string().max(255).optional(),
    // No aceptamos rol/estado desde frontend en registro público
})
    .strict();
exports.loginBodySchema = zod_1.z
    .object({
    correo: zod_1.z.string().email("correo inválido").max(255),
    password: zod_1.z.string().min(1, "password es requerido").max(255),
})
    .strict();
exports.forgotPasswordBodySchema = zod_1.z
    .object({
    correo: zod_1.z.string().email("correo inválido").max(255),
})
    .strict();
exports.resetPasswordBodySchema = zod_1.z
    .object({
    token: zod_1.z.string().min(20, "token inválido").max(500),
    password: zod_1.z.string().min(8, "password debe tener al menos 8 caracteres").max(255),
})
    .strict();
