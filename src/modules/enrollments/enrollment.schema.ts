import { z } from "zod";

export const courseIdParamsSchema = z
  .object({
    courseId: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const enrollmentIdParamsSchema = z
  .object({
    id: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const progressBodySchema = z
  .object({
    progreso: z.number().min(0).max(100),
  })
  .strict();

