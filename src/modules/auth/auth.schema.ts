import { z } from "zod";

export const registerBodySchema = z
  .object({
    nombres: z.string().min(1, "nombres es requerido").max(100),
    apellidos: z.string().min(1, "apellidos es requerido").max(100),
    dpi: z
      .string()
      .min(1, "dpi es requerido")
      .max(20, "dpi debe tener como máximo 20 caracteres"),
    correo: z.string().email("correo inválido").max(255),
    password: z.string().min(8, "password debe tener al menos 8 caracteres").max(255),
    telefono: z.string().max(30).optional(),
    foto_url: z.string().url().max(500).optional(),
    fecha_nacimiento: z.string().max(10).optional(),
    direccion: z.string().max(255).optional(),
    // No aceptamos rol/estado desde frontend en registro público
  })
  .strict();

export const loginBodySchema = z
  .object({
    correo: z.string().email("correo inválido").max(255),
    password: z.string().min(1, "password es requerido").max(255),
  })
  .strict();

export const forgotPasswordBodySchema = z
  .object({
    correo: z.string().email("correo inválido").max(255),
  })
  .strict();

export const resetPasswordBodySchema = z
  .object({
    token: z.string().min(20, "token inválido").max(500),
    password: z.string().min(8, "password debe tener al menos 8 caracteres").max(255),
  })
  .strict();

export const verifyEmailBodySchema = z
  .object({
    token: z.string().min(20, "token inválido").max(500),
  })
  .strict();
