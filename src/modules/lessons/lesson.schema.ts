import { z } from "zod";
import { nullableAppFileUrlFromBody, nullableHttpUrlFromBody } from "../../common/validation/url.schema";

const numFromAny = z.preprocess((v) => {
  if (typeof v === "string" && v.trim() !== "") return Number(v);
  return v;
}, z.number());

const intPositive = numFromAny.pipe(z.number().int().positive());

const boolFromAny = z.preprocess((v) => {
  if (typeof v === "string") return v === "true" || v === "1";
  return v;
}, z.boolean());

export const moduleIdParamsSchema = z.object({ moduleId: intPositive }).strict();
export const lessonIdParamsSchema = z.object({ id: intPositive }).strict();

export const createLessonBodySchema = z
  .object({
    modulo_id: intPositive,
    titulo: z.string().min(1).max(150),
    descripcion: z.string().max(255).nullable().optional(),
    tipo: z.enum(["video", "pdf", "texto", "enlace"]).optional(),
    contenido: z.string().nullable().optional(),
    video_url: nullableAppFileUrlFromBody("video_url").optional(),
    archivo_url: nullableAppFileUrlFromBody("archivo_url").optional(),
    enlace_url: nullableHttpUrlFromBody("enlace_url", 255).optional(),
    duracion_minutos: z.preprocess((v) => (v === "" ? null : v), numFromAny.nullable()).optional(),
    orden: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().min(1)).optional(),
    es_preview: boolFromAny.optional(),
  })
  .strict();

export const updateLessonBodySchema = z
  .object({
    titulo: z.string().min(1).max(150).optional(),
    descripcion: z.string().max(255).nullable().optional(),
    tipo: z.enum(["video", "pdf", "texto", "enlace"]).optional(),
    contenido: z.string().nullable().optional(),
    video_url: nullableAppFileUrlFromBody("video_url").optional(),
    archivo_url: nullableAppFileUrlFromBody("archivo_url").optional(),
    enlace_url: nullableHttpUrlFromBody("enlace_url", 255).optional(),
    duracion_minutos: z.preprocess((v) => (v === "" ? null : v), numFromAny.nullable()).optional(),
    orden: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().min(1)).optional(),
    es_preview: boolFromAny.optional(),
    estado: z.enum(["activo", "inactivo"]).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });
