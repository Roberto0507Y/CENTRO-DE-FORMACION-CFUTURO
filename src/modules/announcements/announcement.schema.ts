import { z } from "zod";
import { nullableAppFileUrlFromBody } from "../../common/validation/url.schema";

export const courseIdParamsSchema = z
  .object({
    courseId: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const announcementIdParamsSchema = z
  .object({
    courseId: z.preprocess((v) => Number(v), z.number().int().positive()),
    id: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const createAnnouncementBodySchema = z
  .object({
    titulo: z.string().min(1).max(150),
    mensaje: z.string().min(1).max(20000),
    estado: z.enum(["publicado", "oculto"]).optional(),
    archivo_url: nullableAppFileUrlFromBody("archivo_url").optional(), // permite limpiar: null
  })
  .strict();

export const updateAnnouncementBodySchema = z
  .object({
    titulo: z.string().min(1).max(150).optional(),
    mensaje: z.string().min(1).max(20000).optional(),
    archivo_url: nullableAppFileUrlFromBody("archivo_url").optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

export const patchAnnouncementStatusBodySchema = z
  .object({
    estado: z.enum(["publicado", "oculto"]),
  })
  .strict();
