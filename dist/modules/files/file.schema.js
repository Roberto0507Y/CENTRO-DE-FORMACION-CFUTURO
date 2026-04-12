"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileIdParamsSchema = void 0;
const zod_1 = require("zod");
exports.fileIdParamsSchema = zod_1.z
    .object({
    id: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
