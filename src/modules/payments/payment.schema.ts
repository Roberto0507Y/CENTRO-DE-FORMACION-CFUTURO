import { z } from "zod";

const toInt = (v: unknown) => (v === undefined ? undefined : Number(v));

export const paymentIdParamsSchema = z
  .object({
    id: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const courseIdParamsSchema = z
  .object({
    courseId: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const listPaymentsQuerySchema = z
  .object({
    limit: z
      .preprocess((v) => (v === undefined ? 20 : Number(v)), z.number().int().min(1).max(200))
      .optional(),
    offset: z
      .preprocess((v) => (v === undefined ? 0 : Number(v)), z.number().int().min(0))
      .optional(),

    estado: z.enum(["pendiente", "pagado", "rechazado", "cancelado", "reembolsado"]).optional(),
    metodo_pago: z
      .enum(["bi_pay", "transferencia", "deposito", "efectivo", "manual"])
      .optional(),
    curso_id: z.preprocess(toInt, z.number().int().positive()).optional(),
    usuario_id: z.preprocess(toInt, z.number().int().positive()).optional(),

    date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict();

export const revenueQuerySchema = z
  .object({
    days: z.preprocess((v) => (v === undefined ? 30 : Number(v)), z.number().int().min(7).max(365)).optional(),
  })
  .strict();

export const updatePaymentStatusBodySchema = z
  .object({
    estado: z.enum(["pendiente", "pagado", "rechazado", "reembolsado"]),
    observaciones: z.string().max(1000).nullable().optional(),
  })
  .strict();

export const manualPaymentBodySchema = z
  .object({
    metodo_pago: z.enum(["manual", "bi_pay"]).optional(),
  })
  .strict();
