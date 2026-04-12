import { z } from "zod";

const toBool = (v: unknown) => (v === undefined ? undefined : v === "1" || v === "true" || v === 1 || v === true);

export const categoryIdParamsSchema = z
  .object({
    id: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const listCategoriesQuerySchema = z
  .object({
    q: z.string().max(100).optional(),
    estado: z.enum(["activo", "inactivo"]).optional(),
    include_counts: z.preprocess(toBool, z.boolean().optional()),
    all: z.preprocess(toBool, z.boolean().optional()),
  })
  .strict();

export const createCategoryBodySchema = z
  .object({
    nombre: z.string().min(1, "nombre es requerido").max(100),
    descripcion: z.string().max(255).nullable().optional(),
    imagen_url: z.string().max(255).nullable().optional(), // URL o ruta
  })
  .strict();

export const updateCategoryBodySchema = z
  .object({
    nombre: z.string().min(1).max(100).optional(),
    descripcion: z.string().max(255).nullable().optional(),
    imagen_url: z.string().max(255).nullable().optional(),
    estado: z.enum(["activo", "inactivo"]).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

export const patchCategoryStatusBodySchema = z
  .object({
    estado: z.enum(["activo", "inactivo"]),
  })
  .strict();
