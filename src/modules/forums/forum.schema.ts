import { z } from "zod";

export const courseIdParamsSchema = z
  .object({
    courseId: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const topicIdParamsSchema = z
  .object({
    courseId: z.preprocess((v) => Number(v), z.number().int().positive()),
    topicId: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const replyIdParamsSchema = z
  .object({
    courseId: z.preprocess((v) => Number(v), z.number().int().positive()),
    topicId: z.preprocess((v) => Number(v), z.number().int().positive()),
    replyId: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const createTopicBodySchema = z
  .object({
    titulo: z.string().min(1).max(150),
    mensaje: z.string().min(1).max(20000),
  })
  .strict();

export const createReplyBodySchema = z
  .object({
    mensaje: z.string().min(1).max(20000),
  })
  .strict();

export const patchTopicBodySchema = z
  .object({
    estado: z.enum(["activo", "cerrado", "oculto"]).optional(),
    fijado: z.preprocess(
      (v) => {
        if (typeof v === "boolean") return v ? 1 : 0;
        if (typeof v === "number") return v ? 1 : 0;
        if (typeof v !== "string") return v;
        const t = v.trim().toLowerCase();
        if (t === "true" || t === "1" || t === "on") return 1;
        if (t === "false" || t === "0" || t === "off") return 0;
        return v;
      },
      z.union([z.literal(0), z.literal(1)])
    ).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, { message: "Debes enviar al menos un campo" });

export const patchReplyStatusBodySchema = z
  .object({
    estado: z.enum(["activo", "oculto"]),
  })
  .strict();

