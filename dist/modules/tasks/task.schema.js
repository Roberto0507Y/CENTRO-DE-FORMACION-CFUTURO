"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradeSubmissionBodySchema = exports.createSubmissionBodySchema = exports.gradeStudentParamsSchema = exports.gradeSubmissionParamsSchema = exports.listSubmissionsQuerySchema = exports.submissionTaskIdParamsSchema = exports.updateTaskBodySchema = exports.createTaskBodySchema = exports.taskIdParamsSchema = exports.courseIdParamsSchema = void 0;
const zod_1 = require("zod");
const url_schema_1 = require("../../common/validation/url.schema");
const mysqlDatetime = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/, "Formato DATETIME inválido");
const numberFromBody = (name) => zod_1.z.preprocess((v) => {
    if (typeof v === "number")
        return v;
    if (typeof v !== "string")
        return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
}, zod_1.z.number({ message: `${name} debe ser un número` }));
const booleanFromBody = () => zod_1.z.preprocess((v) => {
    if (typeof v === "boolean")
        return v;
    if (typeof v === "number")
        return Boolean(v);
    if (typeof v !== "string")
        return v;
    const t = v.trim().toLowerCase();
    if (t === "true" || t === "1" || t === "on")
        return true;
    if (t === "false" || t === "0" || t === "off")
        return false;
    return v;
}, zod_1.z.boolean());
exports.courseIdParamsSchema = zod_1.z
    .object({
    courseId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.taskIdParamsSchema = zod_1.z
    .object({
    id: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.createTaskBodySchema = zod_1.z
    .object({
    titulo: zod_1.z.string().min(1).max(150),
    descripcion: zod_1.z.string().max(255).nullable().optional(),
    instrucciones: zod_1.z.string().max(5000).nullable().optional(),
    archivo_url: (0, url_schema_1.nullableAppFileUrlFromBody)("archivo_url").optional(),
    enlace_url: (0, url_schema_1.nullableHttpUrlFromBody)("enlace_url").optional(),
    puntos: numberFromBody("puntos").pipe(zod_1.z.number().min(0).max(1000)).optional(),
    fecha_apertura: mysqlDatetime.nullable().optional(),
    fecha_entrega: mysqlDatetime,
    fecha_cierre: mysqlDatetime.nullable().optional(),
    permite_entrega_tardia: booleanFromBody().optional(),
    estado: zod_1.z.enum(["borrador", "publicada", "cerrada"]).optional(),
})
    .strict();
exports.updateTaskBodySchema = zod_1.z
    .object({
    titulo: zod_1.z.string().min(1).max(150).optional(),
    descripcion: zod_1.z.string().max(255).nullable().optional(),
    instrucciones: zod_1.z.string().max(5000).nullable().optional(),
    archivo_url: (0, url_schema_1.nullableAppFileUrlFromBody)("archivo_url").optional(),
    enlace_url: (0, url_schema_1.nullableHttpUrlFromBody)("enlace_url").optional(),
    puntos: numberFromBody("puntos").pipe(zod_1.z.number().min(0).max(1000)).optional(),
    fecha_apertura: mysqlDatetime.nullable().optional(),
    fecha_entrega: mysqlDatetime.optional(),
    fecha_cierre: mysqlDatetime.nullable().optional(),
    permite_entrega_tardia: booleanFromBody().optional(),
    estado: zod_1.z.enum(["borrador", "publicada", "cerrada"]).optional(),
})
    .strict()
    .refine((obj) => Object.keys(obj).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
});
exports.submissionTaskIdParamsSchema = zod_1.z
    .object({
    taskId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.listSubmissionsQuerySchema = zod_1.z
    .object({
    limit: zod_1.z.preprocess((v) => (v === undefined ? 50 : Number(v)), zod_1.z.number().int().min(1).max(50)),
    offset: zod_1.z.preprocess((v) => (v === undefined ? 0 : Number(v)), zod_1.z.number().int().min(0)),
    filter: zod_1.z.enum(["todos", "no_entregados"]).default("todos"),
})
    .strict();
exports.gradeSubmissionParamsSchema = zod_1.z
    .object({
    taskId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
    submissionId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.gradeStudentParamsSchema = zod_1.z
    .object({
    taskId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
    studentId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.createSubmissionBodySchema = zod_1.z
    .object({
    comentario_estudiante: zod_1.z.string().max(2000).nullable().optional(),
    enlace_url: (0, url_schema_1.nullableHttpUrlFromBody)("enlace_url").optional(),
    archivo_url: (0, url_schema_1.nullableAppFileUrlFromBody)("archivo_url").optional(),
})
    .strict();
exports.gradeSubmissionBodySchema = zod_1.z
    .object({
    calificacion: numberFromBody("calificación").pipe(zod_1.z.number().min(0).max(1000)),
    comentario_docente: zod_1.z.string().max(2000).nullable().optional(),
    estado: zod_1.z.enum(["revisada", "devuelta", "no_entregada"]).optional(),
})
    .strict();
