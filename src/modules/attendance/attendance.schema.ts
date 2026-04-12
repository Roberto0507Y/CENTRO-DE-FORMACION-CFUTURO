import { z } from "zod";

export const courseIdParamsSchema = z
  .object({
    courseId: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)");

export const attendanceQuerySchema = z
  .object({
    date: dateOnly.optional(),
  })
  .strict();

export const upsertAttendanceBodySchema = z
  .object({
    date: dateOnly,
    items: z
      .array(
        z
          .object({
            estudiante_id: z.number().int().positive(),
            estado: z.enum(["presente", "ausente", "tarde", "justificado"]),
            comentario: z.string().max(255).nullable().optional(),
          })
          .strict()
      )
      .min(1, "Debes enviar al menos un estudiante"),
  })
  .strict();

