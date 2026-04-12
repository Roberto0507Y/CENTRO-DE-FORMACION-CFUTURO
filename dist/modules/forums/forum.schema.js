"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchReplyStatusBodySchema = exports.patchTopicBodySchema = exports.createReplyBodySchema = exports.createTopicBodySchema = exports.replyIdParamsSchema = exports.topicIdParamsSchema = exports.courseIdParamsSchema = void 0;
const zod_1 = require("zod");
exports.courseIdParamsSchema = zod_1.z
    .object({
    courseId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.topicIdParamsSchema = zod_1.z
    .object({
    courseId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
    topicId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.replyIdParamsSchema = zod_1.z
    .object({
    courseId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
    topicId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
    replyId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.createTopicBodySchema = zod_1.z
    .object({
    titulo: zod_1.z.string().min(1).max(150),
    mensaje: zod_1.z.string().min(1).max(20000),
})
    .strict();
exports.createReplyBodySchema = zod_1.z
    .object({
    mensaje: zod_1.z.string().min(1).max(20000),
})
    .strict();
exports.patchTopicBodySchema = zod_1.z
    .object({
    estado: zod_1.z.enum(["activo", "cerrado", "oculto"]).optional(),
    fijado: zod_1.z.preprocess((v) => {
        if (typeof v === "boolean")
            return v ? 1 : 0;
        if (typeof v === "number")
            return v ? 1 : 0;
        if (typeof v !== "string")
            return v;
        const t = v.trim().toLowerCase();
        if (t === "true" || t === "1" || t === "on")
            return 1;
        if (t === "false" || t === "0" || t === "off")
            return 0;
        return v;
    }, zod_1.z.union([zod_1.z.literal(0), zod_1.z.literal(1)])).optional(),
})
    .strict()
    .refine((obj) => Object.keys(obj).length > 0, { message: "Debes enviar al menos un campo" });
exports.patchReplyStatusBodySchema = zod_1.z
    .object({
    estado: zod_1.z.enum(["activo", "oculto"]),
})
    .strict();
