import { z } from "zod";
import { nullableAppFileUrlFromBody, nullableHttpUrlFromBody } from "../../common/validation/url.schema";

const mysqlDatetime = z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/, "Formato DATETIME inválido");

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

const booleanFromBody = () =>
  z.preprocess((v) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return Boolean(v);
    if (typeof v !== "string") return v;
    const t = v.trim().toLowerCase();
    if (t === "true" || t === "1" || t === "on") return true;
    if (t === "false" || t === "0" || t === "off") return false;
    return v;
  }, z.boolean());

export const courseIdParamsSchema = z
  .object({
    courseId: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const taskIdParamsSchema = z
  .object({
    id: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const createTaskBodySchema = z
  .object({
    titulo: z.string().min(1).max(150),
    descripcion: z.string().max(255).nullable().optional(),
    instrucciones: z.string().max(5000).nullable().optional(),
    archivo_url: nullableAppFileUrlFromBody("archivo_url").optional(),
    enlace_url: nullableHttpUrlFromBody("enlace_url").optional(),
    puntos: numberFromBody("puntos").pipe(z.number().min(0).max(1000)).optional(),
    fecha_apertura: mysqlDatetime.nullable().optional(),
    fecha_entrega: mysqlDatetime,
    fecha_cierre: mysqlDatetime.nullable().optional(),
    permite_entrega_tardia: booleanFromBody().optional(),
    estado: z.enum(["borrador", "publicada", "cerrada"]).optional(),
  })
  .strict();

export const updateTaskBodySchema = z
  .object({
    titulo: z.string().min(1).max(150).optional(),
    descripcion: z.string().max(255).nullable().optional(),
    instrucciones: z.string().max(5000).nullable().optional(),
    archivo_url: nullableAppFileUrlFromBody("archivo_url").optional(),
    enlace_url: nullableHttpUrlFromBody("enlace_url").optional(),
    puntos: numberFromBody("puntos").pipe(z.number().min(0).max(1000)).optional(),
    fecha_apertura: mysqlDatetime.nullable().optional(),
    fecha_entrega: mysqlDatetime.optional(),
    fecha_cierre: mysqlDatetime.nullable().optional(),
    permite_entrega_tardia: booleanFromBody().optional(),
    estado: z.enum(["borrador", "publicada", "cerrada"]).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "Debes enviar al menos un campo para actualizar",
  });

export const submissionTaskIdParamsSchema = z
  .object({
    taskId: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const listSubmissionsQuerySchema = z
  .object({
    limit: z.preprocess((v) => (v === undefined ? 50 : Number(v)), z.number().int().min(1).max(50)),
    offset: z.preprocess((v) => (v === undefined ? 0 : Number(v)), z.number().int().min(0)),
  })
  .strict();

export const gradeSubmissionParamsSchema = z
  .object({
    taskId: z.preprocess((v) => Number(v), z.number().int().positive()),
    submissionId: z.preprocess((v) => Number(v), z.number().int().positive()),
  })
  .strict();

export const createSubmissionBodySchema = z
  .object({
    comentario_estudiante: z.string().max(2000).nullable().optional(),
    enlace_url: nullableHttpUrlFromBody("enlace_url").optional(),
    archivo_url: nullableAppFileUrlFromBody("archivo_url").optional(),
  })
  .strict();

export const gradeSubmissionBodySchema = z
  .object({
    calificacion: numberFromBody("calificación").pipe(z.number().min(0).max(1000)),
    comentario_docente: z.string().max(2000).nullable().optional(),
    estado: z.enum(["revisada", "devuelta"]).optional(),
  })
  .strict();
