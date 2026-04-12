import { z } from "zod";

export const userIdParamsSchema = z
  .object({
    id: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const updateUserBodySchema = z
  .object({
    nombres: z.string().min(1).max(100).optional(),
    apellidos: z.string().min(1).max(100).optional(),
    telefono: z.string().max(30).nullable().optional(),
    foto_url: z.string().url().max(500).nullable().optional(),
    fecha_nacimiento: z.string().max(10).nullable().optional(),
    direccion: z.string().max(255).nullable().optional(),
    rol: z.enum(["admin", "docente", "estudiante"]).optional(),
    estado: z.enum(["activo", "inactivo", "suspendido"]).optional(),
  })
  .strict();

export const listUsersQuerySchema = z
  .object({
    search: z
      .preprocess((v) => {
        if (typeof v !== "string") return v;
        const trimmed = v.trim();
        return trimmed ? trimmed : undefined;
      }, z.string().min(1).max(150))
      .optional(),
    limit: z
      .preprocess((v) => (v === undefined ? 20 : Number(v)), z.number().int().min(1).max(200))
      .optional(),
    offset: z
      .preprocess((v) => (v === undefined ? 0 : Number(v)), z.number().int().min(0))
      .optional(),
  })
  .strict();
