"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseIdParamsSchema = void 0;
const zod_1 = require("zod");
exports.courseIdParamsSchema = zod_1.z.object({
    courseId: zod_1.z
        .string()
        .min(1)
        .transform((v) => Number(v))
        .refine((n) => Number.isFinite(n) && n > 0, "courseId inválido"),
});
