"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teachingListQuerySchema = exports.updateCourseBodySchema = exports.createCourseBodySchema = exports.courseListQuerySchema = exports.courseSlugParamsSchema = exports.courseIdParamsSchema = void 0;
const zod_1 = require("zod");
const paymentLink_1 = require("../../common/utils/paymentLink");
const idFromParam = zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive());
const nullableHttpUrl = (fieldName, max) => zod_1.z.preprocess((v) => (0, paymentLink_1.normalizePaymentLinkValue)(v), zod_1.z.string()
    .url(`${fieldName} inválido`)
    .max(max)
    .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
}, `${fieldName} debe usar http o https`)
    .nullable());
exports.courseIdParamsSchema = zod_1.z.object({ id: idFromParam }).strict();
exports.courseSlugParamsSchema = zod_1.z
    .object({
    slug: zod_1.z.string().min(1).max(180),
})
    .strict();
exports.courseListQuerySchema = zod_1.z
    .object({
    categoria_id: zod_1.z.preprocess((v) => (v === undefined ? undefined : Number(v)), zod_1.z.number().int().positive()).optional(),
    tipo_acceso: zod_1.z.enum(["gratis", "pago"]).optional(),
    nivel: zod_1.z.enum(["basico", "intermedio", "avanzado"]).optional(),
    docente_id: zod_1.z.preprocess((v) => (v === undefined ? undefined : Number(v)), zod_1.z.number().int().positive()).optional(),
    search: zod_1.z.string().min(1).max(150).optional(),
    page: zod_1.z.preprocess((v) => (v === undefined ? 1 : Number(v)), zod_1.z.number().int().min(1)).optional(),
    limit: zod_1.z.preprocess((v) => (v === undefined ? 20 : Number(v)), zod_1.z.number().int().min(1).max(100)).optional(),
})
    .strict();
exports.createCourseBodySchema = zod_1.z
    .object({
    categoria_id: zod_1.z.number().int().positive(),
    docente_id: zod_1.z.number().int().positive().optional(),
    titulo: zod_1.z.string().min(1).max(150),
    slug: zod_1.z.string().min(1).max(180).optional(),
    descripcion_corta: zod_1.z.string().max(255).nullable().optional(),
    descripcion: zod_1.z.string().nullable().optional(),
    imagen_url: zod_1.z.string().max(255).nullable().optional(),
    video_intro_url: zod_1.z.string().max(255).nullable().optional(),
    payment_link: nullableHttpUrl("payment_link", 500).optional(),
    tipo_acceso: zod_1.z.enum(["gratis", "pago"]).optional(),
    precio: zod_1.z.number().nonnegative().optional(),
    nivel: zod_1.z.enum(["basico", "intermedio", "avanzado"]).optional(),
    estado: zod_1.z.enum(["borrador", "publicado", "oculto"]).optional(),
    duracion_horas: zod_1.z.number().nonnegative().nullable().optional(),
    requisitos: zod_1.z.string().nullable().optional(),
    objetivos: zod_1.z.string().nullable().optional(),
    fecha_publicacion: zod_1.z.string().nullable().optional(),
})
    .strict();
exports.updateCourseBodySchema = zod_1.z
    .object({
    categoria_id: zod_1.z.number().int().positive().optional(),
    docente_id: zod_1.z.number().int().positive().optional(),
    titulo: zod_1.z.string().min(1).max(150).optional(),
    slug: zod_1.z.string().min(1).max(180).optional(),
    descripcion_corta: zod_1.z.string().max(255).nullable().optional(),
    descripcion: zod_1.z.string().nullable().optional(),
    imagen_url: zod_1.z.string().max(255).nullable().optional(),
    video_intro_url: zod_1.z.string().max(255).nullable().optional(),
    payment_link: nullableHttpUrl("payment_link", 500).optional(),
    tipo_acceso: zod_1.z.enum(["gratis", "pago"]).optional(),
    precio: zod_1.z.number().nonnegative().optional(),
    nivel: zod_1.z.enum(["basico", "intermedio", "avanzado"]).optional(),
    estado: zod_1.z.enum(["borrador", "publicado", "oculto"]).optional(),
    duracion_horas: zod_1.z.number().nonnegative().nullable().optional(),
    requisitos: zod_1.z.string().nullable().optional(),
    objetivos: zod_1.z.string().nullable().optional(),
    fecha_publicacion: zod_1.z.string().nullable().optional(),
})
    .strict()
    .refine((obj) => Object.keys(obj).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
});
exports.teachingListQuerySchema = zod_1.z
    .object({
    docente_id: zod_1.z.preprocess((v) => (v === undefined ? undefined : Number(v)), zod_1.z.number().int().positive()).optional(),
    search: zod_1.z
        .preprocess((v) => {
        if (typeof v !== "string")
            return v;
        const trimmed = v.trim();
        return trimmed ? trimmed : undefined;
    }, zod_1.z.string().min(1).max(150))
        .optional(),
    page: zod_1.z.preprocess((v) => (v === undefined ? 1 : Number(v)), zod_1.z.number().int().min(1)).optional(),
    limit: zod_1.z.preprocess((v) => (v === undefined ? 20 : Number(v)), zod_1.z.number().int().min(1).max(100)).optional(),
})
    .strict();
