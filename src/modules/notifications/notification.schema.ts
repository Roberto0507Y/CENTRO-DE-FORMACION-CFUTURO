import { z } from "zod";

const idFromParam = z.preprocess((v) => Number(v), z.number().int().positive());

export const notificationIdParamsSchema = z.object({ id: idFromParam }).strict();

export const listNotificationsQuerySchema = z
  .object({
    limit: z.preprocess((v) => (v === undefined ? 20 : Number(v)), z.number().int().min(1).max(100)).optional(),
    offset: z.preprocess((v) => (v === undefined ? 0 : Number(v)), z.number().int().min(0)).optional(),
    unread: z
      .preprocess((v) => (v === undefined ? undefined : String(v)), z.enum(["0", "1"]))
      .optional(),
  })
  .strict();

