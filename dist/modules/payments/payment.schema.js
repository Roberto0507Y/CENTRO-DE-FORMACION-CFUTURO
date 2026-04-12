"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualPaymentBodySchema = exports.updatePaymentStatusBodySchema = exports.revenueQuerySchema = exports.listPaymentsQuerySchema = exports.courseIdParamsSchema = exports.paymentIdParamsSchema = void 0;
const zod_1 = require("zod");
const toInt = (v) => (v === undefined ? undefined : Number(v));
exports.paymentIdParamsSchema = zod_1.z
    .object({
    id: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.courseIdParamsSchema = zod_1.z
    .object({
    courseId: zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive()),
})
    .strict();
exports.listPaymentsQuerySchema = zod_1.z
    .object({
    limit: zod_1.z
        .preprocess((v) => (v === undefined ? 20 : Number(v)), zod_1.z.number().int().min(1).max(200))
        .optional(),
    offset: zod_1.z
        .preprocess((v) => (v === undefined ? 0 : Number(v)), zod_1.z.number().int().min(0))
        .optional(),
    estado: zod_1.z.enum(["pendiente", "pagado", "rechazado", "cancelado", "reembolsado"]).optional(),
    metodo_pago: zod_1.z
        .enum(["bi_pay", "transferencia", "deposito", "efectivo", "manual"])
        .optional(),
    curso_id: zod_1.z.preprocess(toInt, zod_1.z.number().int().positive()).optional(),
    usuario_id: zod_1.z.preprocess(toInt, zod_1.z.number().int().positive()).optional(),
    date_from: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})
    .strict();
exports.revenueQuerySchema = zod_1.z
    .object({
    days: zod_1.z.preprocess((v) => (v === undefined ? 30 : Number(v)), zod_1.z.number().int().min(7).max(365)).optional(),
})
    .strict();
exports.updatePaymentStatusBodySchema = zod_1.z
    .object({
    estado: zod_1.z.enum(["pendiente", "pagado", "rechazado", "reembolsado"]),
    observaciones: zod_1.z.string().max(1000).nullable().optional(),
})
    .strict();
exports.manualPaymentBodySchema = zod_1.z
    .object({
    metodo_pago: zod_1.z.enum(["manual", "bi_pay"]).optional(),
})
    .strict();
