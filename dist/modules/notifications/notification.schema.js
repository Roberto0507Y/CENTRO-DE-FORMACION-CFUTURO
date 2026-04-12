"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotificationsQuerySchema = exports.notificationIdParamsSchema = void 0;
const zod_1 = require("zod");
const idFromParam = zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive());
exports.notificationIdParamsSchema = zod_1.z.object({ id: idFromParam }).strict();
exports.listNotificationsQuerySchema = zod_1.z
    .object({
    limit: zod_1.z.preprocess((v) => (v === undefined ? 20 : Number(v)), zod_1.z.number().int().min(1).max(100)).optional(),
    offset: zod_1.z.preprocess((v) => (v === undefined ? 0 : Number(v)), zod_1.z.number().int().min(0)).optional(),
    unread: zod_1.z
        .preprocess((v) => (v === undefined ? undefined : String(v)), zod_1.z.enum(["0", "1"]))
        .optional(),
})
    .strict();
