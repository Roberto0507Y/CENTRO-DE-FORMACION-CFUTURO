"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressBodySchema = exports.enrollmentIdParamsSchema = exports.courseIdParamsSchema = void 0;
const zod_1 = require("zod");
exports.courseIdParamsSchema = zod_1.z
    .object({
    courseId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.enrollmentIdParamsSchema = zod_1.z
    .object({
    id: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.progressBodySchema = zod_1.z
    .object({
    progreso: zod_1.z.number().min(0).max(100),
})
    .strict();
