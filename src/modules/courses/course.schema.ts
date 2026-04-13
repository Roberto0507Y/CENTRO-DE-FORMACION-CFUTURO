import { z } from "zod";
import { normalizePaymentLinkValue } from "../../common/utils/paymentLink";

const SHORT_DESCRIPTION_MAX = 255;

const idFromParam = z.preprocess((v) => Number(v), z.number().int().positive());
const nullableHttpUrl = (fieldName: string, max: number) =>
  z.preprocess((v) => normalizePaymentLinkValue(v), z.string()
    .url(`${fieldName} inválido`)
    .max(max)
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    }, `${fieldName} debe usar http o https`)
    .nullable());

export const courseIdParamsSchema = z.object({ id: idFromParam }).strict();

export const courseSlugParamsSchema = z
  .object({
    slug: z.string().min(1).max(180),
  })
  .strict();

export const courseListQuerySchema = z
  .object({
    categoria_id: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().positive()).optional(),
    tipo_acceso: z.enum(["gratis", "pago"]).optional(),
    nivel: z.enum(["basico", "intermedio", "avanzado"]).optional(),
    docente_id: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().positive()).optional(),
    search: z.string().min(1).max(150).optional(),
    page: z.preprocess((v) => (v === undefined ? 1 : Number(v)), z.number().int().min(1)).optional(),
    limit: z.preprocess((v) => (v === undefined ? 20 : Number(v)), z.number().int().min(1).max(100)).optional(),
  })
  .strict();

export const createCourseBodySchema = z
  .object({
    categoria_id: z.number().int().positive(),
    docente_id: z.number().int().positive().optional(),
    titulo: z.string().min(1).max(150),
    slug: z.string().min(1).max(180).optional(),
    descripcion_corta: z
      .string()
      .max(SHORT_DESCRIPTION_MAX, `Debe tener máximo ${SHORT_DESCRIPTION_MAX} caracteres.`)
      .nullable()
      .optional(),
    descripcion: z.string().nullable().optional(),
    imagen_url: z.string().max(255).nullable().optional(),
    video_intro_url: z.string().max(255).nullable().optional(),
    payment_link: nullableHttpUrl("payment_link", 500).optional(),
    tipo_acceso: z.enum(["gratis", "pago"]).optional(),
    precio: z.number().nonnegative().optional(),
    nivel: z.enum(["basico", "intermedio", "avanzado"]).optional(),
    estado: z.enum(["borrador", "publicado", "oculto"]).optional(),
    duracion_horas: z.number().nonnegative().nullable().optional(),
    requisitos: z.string().nullable().optional(),
    objetivos: z.string().nullable().optional(),
    fecha_publicacion: z.string().nullable().optional(),
  })
  .strict();

export const updateCourseBodySchema = z
  .object({
    categoria_id: z.number().int().positive().optional(),
    docente_id: z.number().int().positive().optional(),
    titulo: z.string().min(1).max(150).optional(),
    slug: z.string().min(1).max(180).optional(),
    descripcion_corta: z
      .string()
      .max(SHORT_DESCRIPTION_MAX, `Debe tener máximo ${SHORT_DESCRIPTION_MAX} caracteres.`)
      .nullable()
      .optional(),
    descripcion: z.string().nullable().optional(),
    imagen_url: z.string().max(255).nullable().optional(),
    video_intro_url: z.string().max(255).nullable().optional(),
    payment_link: nullableHttpUrl("payment_link", 500).optional(),
    tipo_acceso: z.enum(["gratis", "pago"]).optional(),
    precio: z.number().nonnegative().optional(),
    nivel: z.enum(["basico", "intermedio", "avanzado"]).optional(),
    estado: z.enum(["borrador", "publicado", "oculto"]).optional(),
    duracion_horas: z.number().nonnegative().nullable().optional(),
    requisitos: z.string().nullable().optional(),
    objetivos: z.string().nullable().optional(),
    fecha_publicacion: z.string().nullable().optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

export const teachingListQuerySchema = z
  .object({
    docente_id: z.preprocess((v) => (v === undefined ? undefined : Number(v)), z.number().int().positive()).optional(),
    search: z
      .preprocess((v) => {
        if (typeof v !== "string") return v;
        const trimmed = v.trim();
        return trimmed ? trimmed : undefined;
      }, z.string().min(1).max(150))
      .optional(),
    page: z.preprocess((v) => (v === undefined ? 1 : Number(v)), z.number().int().min(1)).optional(),
    limit: z.preprocess((v) => (v === undefined ? 20 : Number(v)), z.number().int().min(1).max(100)).optional(),
  })
  .strict();
