"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLessonBodySchema = exports.createLessonBodySchema = exports.lessonIdParamsSchema = exports.moduleIdParamsSchema = void 0;
const zod_1 = require("zod");
const url_schema_1 = require("../../common/validation/url.schema");
const numFromAny = zod_1.z.preprocess((v) => {
    if (typeof v === "string" && v.trim() !== "")
        return Number(v);
    return v;
}, zod_1.z.number());
const intPositive = numFromAny.pipe(zod_1.z.number().int().positive());
const boolFromAny = zod_1.z.preprocess((v) => {
    if (typeof v === "string")
        return v === "true" || v === "1";
    return v;
}, zod_1.z.boolean());
exports.moduleIdParamsSchema = zod_1.z.object({ moduleId: intPositive }).strict();
exports.lessonIdParamsSchema = zod_1.z.object({ id: intPositive }).strict();
exports.createLessonBodySchema = zod_1.z
    .object({
    modulo_id: intPositive,
    titulo: zod_1.z.string().min(1).max(150),
    descripcion: zod_1.z.string().max(255).nullable().optional(),
    tipo: zod_1.z.enum(["video", "pdf", "texto", "enlace"]).optional(),
    contenido: zod_1.z.string().nullable().optional(),
    video_url: (0, url_schema_1.nullableAppFileUrlFromBody)("video_url").optional(),
    archivo_url: (0, url_schema_1.nullableAppFileUrlFromBody)("archivo_url").optional(),
    enlace_url: (0, url_schema_1.nullableHttpUrlFromBody)("enlace_url", 255).optional(),
    duracion_minutos: zod_1.z.preprocess((v) => (v === "" ? null : v), numFromAny.nullable()).optional(),
    orden: zod_1.z.preprocess((v) => (v === undefined ? undefined : Number(v)), zod_1.z.number().int().min(1)).optional(),
    es_preview: boolFromAny.optional(),
})
    .strict();
exports.updateLessonBodySchema = zod_1.z
    .object({
    titulo: zod_1.z.string().min(1).max(150).optional(),
    descripcion: zod_1.z.string().max(255).nullable().optional(),
    tipo: zod_1.z.enum(["video", "pdf", "texto", "enlace"]).optional(),
    contenido: zod_1.z.string().nullable().optional(),
    video_url: (0, url_schema_1.nullableAppFileUrlFromBody)("video_url").optional(),
    archivo_url: (0, url_schema_1.nullableAppFileUrlFromBody)("archivo_url").optional(),
    enlace_url: (0, url_schema_1.nullableHttpUrlFromBody)("enlace_url", 255).optional(),
    duracion_minutos: zod_1.z.preprocess((v) => (v === "" ? null : v), numFromAny.nullable()).optional(),
    orden: zod_1.z.preprocess((v) => (v === undefined ? undefined : Number(v)), zod_1.z.number().int().min(1)).optional(),
    es_preview: boolFromAny.optional(),
    estado: zod_1.z.enum(["activo", "inactivo"]).optional(),
})
    .strict()
    .refine((obj) => Object.keys(obj).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
});
