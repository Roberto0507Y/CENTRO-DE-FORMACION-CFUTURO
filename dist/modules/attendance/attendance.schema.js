"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertAttendanceBodySchema = exports.attendanceQuerySchema = exports.courseIdParamsSchema = void 0;
const zod_1 = require("zod");
exports.courseIdParamsSchema = zod_1.z
    .object({
    courseId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
const dateOnly = zod_1.z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)");
exports.attendanceQuerySchema = zod_1.z
    .object({
    date: dateOnly.optional(),
})
    .strict();
exports.upsertAttendanceBodySchema = zod_1.z
    .object({
    date: dateOnly,
    items: zod_1.z
        .array(zod_1.z
        .object({
        estudiante_id: zod_1.z.number().int().positive(),
        estado: zod_1.z.enum(["presente", "ausente", "tarde", "justificado"]),
        comentario: zod_1.z.string().max(255).nullable().optional(),
    })
        .strict())
        .min(1, "Debes enviar al menos un estudiante"),
})
    .strict();
