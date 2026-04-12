"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchMaterialStatusBodySchema = exports.updateMaterialBodySchema = exports.createMaterialBodySchema = exports.materialIdParamsSchema = exports.courseIdParamsSchema = void 0;
const zod_1 = require("zod");
const url_schema_1 = require("../../common/validation/url.schema");
const nullableText = (max) => zod_1.z.preprocess((v) => {
    if (v === null || v === undefined)
        return v;
    if (typeof v !== "string")
        return v;
    const t = v.trim();
    return t.length === 0 ? null : t;
}, zod_1.z.string().max(max).nullable());
const numberFromBody = (name) => zod_1.z.preprocess((v) => {
    if (typeof v === "number")
        return v;
    if (typeof v !== "string")
        return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
}, zod_1.z.number({ message: `${name} debe ser un número` }));
exports.courseIdParamsSchema = zod_1.z
    .object({
    courseId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.materialIdParamsSchema = zod_1.z
    .object({
    courseId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
    id: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.createMaterialBodySchema = zod_1.z
    .object({
    modulo_id: numberFromBody("modulo_id").pipe(zod_1.z.number().int().positive()).nullable().optional(),
    titulo: zod_1.z.string().min(1).max(150),
    descripcion: nullableText(5000).optional(),
    tipo: zod_1.z.enum(["archivo", "video", "enlace", "pdf", "imagen"]).optional(),
    archivo_url: (0, url_schema_1.nullableAppFileUrlFromBody)("archivo_url").optional(),
    enlace_url: (0, url_schema_1.nullableHttpUrlFromBody)("enlace_url").optional(),
    orden: numberFromBody("orden").pipe(zod_1.z.number().int().min(1).max(100000)).optional(),
    estado: zod_1.z.enum(["activo", "inactivo"]).optional(),
})
    .strict();
exports.updateMaterialBodySchema = zod_1.z
    .object({
    modulo_id: numberFromBody("modulo_id").pipe(zod_1.z.number().int().positive()).nullable().optional(),
    titulo: zod_1.z.string().min(1).max(150).optional(),
    descripcion: nullableText(5000).optional(),
    tipo: zod_1.z.enum(["archivo", "video", "enlace", "pdf", "imagen"]).optional(),
    archivo_url: (0, url_schema_1.nullableAppFileUrlFromBody)("archivo_url").optional(),
    enlace_url: (0, url_schema_1.nullableHttpUrlFromBody)("enlace_url").optional(),
    orden: numberFromBody("orden").pipe(zod_1.z.number().int().min(1).max(100000)).optional(),
    estado: zod_1.z.enum(["activo", "inactivo"]).optional(),
})
    .strict()
    .refine((obj) => Object.keys(obj).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
});
exports.patchMaterialStatusBodySchema = zod_1.z
    .object({
    estado: zod_1.z.enum(["activo", "inactivo"]),
})
    .strict();
