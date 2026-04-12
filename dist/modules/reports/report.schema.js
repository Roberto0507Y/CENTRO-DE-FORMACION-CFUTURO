"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zoneReportQuerySchema = void 0;
const zod_1 = require("zod");
const idFromQuery = zod_1.z.preprocess((value) => Number(value), zod_1.z.number().int().positive());
exports.zoneReportQuerySchema = zod_1.z.object({
    course_id: idFromQuery,
}).strict();
