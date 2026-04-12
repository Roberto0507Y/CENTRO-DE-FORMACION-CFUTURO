import { z } from "zod";
import { nullableAppFileUrlFromBody, nullableHttpUrlFromBody } from "../../common/validation/url.schema";

const nullableText = (max: number) =>
  z.preprocess((v) => {
    if (v === null || v === undefined) return v;
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t.length === 0 ? null : t;
  }, z.string().max(max).nullable());

const numberFromBody = (name: string) =>
  z.preprocess(
    (v) => {
      if (typeof v === "number") return v;
      if (typeof v !== "string") return v;
      const n = Number(v);
      return Number.isFinite(n) ? n : v;
    },
    z.number({ message: `${name} debe ser un número` })
  );

export const courseIdParamsSchema = z
  .object({
    courseId: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const materialIdParamsSchema = z
  .object({
    courseId: z.preprocess((v) => Number(v), z.number().int().positive()),
    id: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const createMaterialBodySchema = z
  .object({
    modulo_id: numberFromBody("modulo_id").pipe(z.number().int().positive()).nullable().optional(),
    titulo: z.string().min(1).max(150),
    descripcion: nullableText(5000).optional(),
    tipo: z.enum(["archivo", "video", "enlace", "pdf", "imagen"]).optional(),
    archivo_url: nullableAppFileUrlFromBody("archivo_url").optional(),
    enlace_url: nullableHttpUrlFromBody("enlace_url").optional(),
    orden: numberFromBody("orden").pipe(z.number().int().min(1).max(100000)).optional(),
    estado: z.enum(["activo", "inactivo"]).optional(),
  })
  .strict();

export const updateMaterialBodySchema = z
  .object({
    modulo_id: numberFromBody("modulo_id").pipe(z.number().int().positive()).nullable().optional(),
    titulo: z.string().min(1).max(150).optional(),
    descripcion: nullableText(5000).optional(),
    tipo: z.enum(["archivo", "video", "enlace", "pdf", "imagen"]).optional(),
    archivo_url: nullableAppFileUrlFromBody("archivo_url").optional(),
    enlace_url: nullableHttpUrlFromBody("enlace_url").optional(),
    orden: numberFromBody("orden").pipe(z.number().int().min(1).max(100000)).optional(),
    estado: z.enum(["activo", "inactivo"]).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

export const patchMaterialStatusBodySchema = z
  .object({
    estado: z.enum(["activo", "inactivo"]),
  })
  .strict();
