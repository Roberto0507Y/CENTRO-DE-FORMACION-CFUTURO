"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchCategoryStatusBodySchema = exports.updateCategoryBodySchema = exports.createCategoryBodySchema = exports.listCategoriesQuerySchema = exports.categoryIdParamsSchema = void 0;
const zod_1 = require("zod");
const toBool = (v) => (v === undefined ? undefined : v === "1" || v === "true" || v === 1 || v === true);
exports.categoryIdParamsSchema = zod_1.z
    .object({
    id: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.listCategoriesQuerySchema = zod_1.z
    .object({
    q: zod_1.z.string().max(100).optional(),
    estado: zod_1.z.enum(["activo", "inactivo"]).optional(),
    include_counts: zod_1.z.preprocess(toBool, zod_1.z.boolean().optional()),
    all: zod_1.z.preprocess(toBool, zod_1.z.boolean().optional()),
})
    .strict();
exports.createCategoryBodySchema = zod_1.z
    .object({
    nombre: zod_1.z.string().min(1, "nombre es requerido").max(100),
    descripcion: zod_1.z.string().max(255).nullable().optional(),
    imagen_url: zod_1.z.string().max(255).nullable().optional(), // URL o ruta
})
    .strict();
exports.updateCategoryBodySchema = zod_1.z
    .object({
    nombre: zod_1.z.string().min(1).max(100).optional(),
    descripcion: zod_1.z.string().max(255).nullable().optional(),
    imagen_url: zod_1.z.string().max(255).nullable().optional(),
    estado: zod_1.z.enum(["activo", "inactivo"]).optional(),
})
    .strict()
    .refine((obj) => Object.keys(obj).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
});
exports.patchCategoryStatusBodySchema = zod_1.z
    .object({
    estado: zod_1.z.enum(["activo", "inactivo"]),
})
    .strict();
