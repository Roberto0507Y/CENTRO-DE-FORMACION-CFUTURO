import { z } from "zod";

export const fileIdParamsSchema = z
  .object({
    id: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

