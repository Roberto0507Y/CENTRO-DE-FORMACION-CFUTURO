import { z } from "zod";

export const courseIdParamsSchema = z.object({
  courseId: z
    .string()
    .min(1)
    .transform((v) => Number(v))
    .refine((n) => Number.isFinite(n) && n > 0, "courseId inválido"),
});

