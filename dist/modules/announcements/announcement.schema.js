"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchAnnouncementStatusBodySchema = exports.updateAnnouncementBodySchema = exports.createAnnouncementBodySchema = exports.announcementIdParamsSchema = exports.courseIdParamsSchema = void 0;
const zod_1 = require("zod");
const url_schema_1 = require("../../common/validation/url.schema");
exports.courseIdParamsSchema = zod_1.z
    .object({
    courseId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.announcementIdParamsSchema = zod_1.z
    .object({
    courseId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
    id: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.createAnnouncementBodySchema = zod_1.z
    .object({
    titulo: zod_1.z.string().min(1).max(150),
    mensaje: zod_1.z.string().min(1).max(20000),
    estado: zod_1.z.enum(["publicado", "oculto"]).optional(),
    archivo_url: (0, url_schema_1.nullableAppFileUrlFromBody)("archivo_url").optional(), // permite limpiar: null
})
    .strict();
exports.updateAnnouncementBodySchema = zod_1.z
    .object({
    titulo: zod_1.z.string().min(1).max(150).optional(),
    mensaje: zod_1.z.string().min(1).max(20000).optional(),
    archivo_url: (0, url_schema_1.nullableAppFileUrlFromBody)("archivo_url").optional(),
})
    .strict()
    .refine((obj) => Object.keys(obj).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
});
exports.patchAnnouncementStatusBodySchema = zod_1.z
    .object({
    estado: zod_1.z.enum(["publicado", "oculto"]),
})
    .strict();
