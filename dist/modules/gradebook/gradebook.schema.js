"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.courseIdParamsSchema = void 0;
const zod_1 = require("zod");
const idFromParam = zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive());
exports.courseIdParamsSchema = zod_1.z.object({ courseId: idFromParam }).strict();
