import { z } from "zod";

const mysqlDatetime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/, "Formato DATETIME inválido");

const idFromParam = (name: string) =>
  z.preprocess((v) => Number(v), z.number().int().positive({ message: `${name} inválido` }));

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

export const courseIdParamsSchema = z.object({ courseId: idFromParam("courseId") }).strict();

export const quizIdParamsSchema = z
  .object({ courseId: idFromParam("courseId"), quizId: idFromParam("quizId") })
  .strict();

export const questionIdParamsSchema = z
  .object({
    courseId: idFromParam("courseId"),
    quizId: idFromParam("quizId"),
    questionId: idFromParam("questionId"),
  })
  .strict();

export const attemptParamsSchema = z
  .object({
    courseId: idFromParam("courseId"),
    quizId: idFromParam("quizId"),
    attemptId: idFromParam("attemptId"),
  })
  .strict();

export const createQuizBodySchema = z
  .object({
    modulo_id: z.number().int().positive().nullable().optional(),
    titulo: z.string().min(1).max(150),
    descripcion: z.string().nullable().optional(),
    instrucciones: z.string().nullable().optional(),
    puntaje_total: numberFromBody("puntaje_total").pipe(z.number().min(0.01).max(100000)).optional(),
    tiempo_limite_minutos: numberFromBody("tiempo_limite_minutos").pipe(z.number().int().min(1).max(600)).nullable().optional(),
    intentos_permitidos: numberFromBody("intentos_permitidos").pipe(z.number().int().min(1).max(20)).optional(),
    fecha_apertura: mysqlDatetime.nullable().optional(),
    fecha_cierre: mysqlDatetime.nullable().optional(),
    mostrar_resultado_inmediato: booleanFromBody().optional(),
    estado: z.enum(["borrador", "publicado", "cerrado"]).optional(),
  })
  .strict();

export const updateQuizBodySchema = z
  .object({
    modulo_id: z.number().int().positive().nullable().optional(),
    titulo: z.string().min(1).max(150).optional(),
    descripcion: z.string().nullable().optional(),
    instrucciones: z.string().nullable().optional(),
    puntaje_total: numberFromBody("puntaje_total").pipe(z.number().min(0.01).max(100000)).optional(),
    tiempo_limite_minutos: numberFromBody("tiempo_limite_minutos").pipe(z.number().int().min(1).max(600)).nullable().optional(),
    intentos_permitidos: numberFromBody("intentos_permitidos").pipe(z.number().int().min(1).max(20)).optional(),
    fecha_apertura: mysqlDatetime.nullable().optional(),
    fecha_cierre: mysqlDatetime.nullable().optional(),
    mostrar_resultado_inmediato: booleanFromBody().optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, { message: "Debes enviar al menos un campo para actualizar" });

export const patchQuizStatusBodySchema = z.object({ estado: z.enum(["borrador", "publicado", "cerrado"]) }).strict();

export const createQuestionBodySchema = z
  .object({
    enunciado: z.string().min(1).max(20000),
    tipo: z.enum(["opcion_unica", "verdadero_falso", "respuesta_corta"]),
    opcion_a: z.string().max(255).nullable().optional(),
    opcion_b: z.string().max(255).nullable().optional(),
    opcion_c: z.string().max(255).nullable().optional(),
    opcion_d: z.string().max(255).nullable().optional(),
    respuesta_correcta: z.string().min(1).max(255),
    respuesta_correcta_a: z.string().max(255).nullable().optional(),
    respuesta_correcta_b: z.string().max(255).nullable().optional(),
    respuesta_correcta_c: z.string().max(255).nullable().optional(),
    respuesta_correcta_d: z.string().max(255).nullable().optional(),
    explicacion: z.string().nullable().optional(),
    puntos: numberFromBody("puntos").pipe(z.number().min(0.01).max(10000)).optional(),
    orden: numberFromBody("orden").pipe(z.number().int().min(1).max(10000)).optional(),
    estado: z.enum(["activo", "inactivo"]).optional(),
  })
  .strict();

export const updateQuestionBodySchema = z
  .object({
    enunciado: z.string().min(1).max(20000).optional(),
    tipo: z.enum(["opcion_unica", "verdadero_falso", "respuesta_corta"]).optional(),
    opcion_a: z.string().max(255).nullable().optional(),
    opcion_b: z.string().max(255).nullable().optional(),
    opcion_c: z.string().max(255).nullable().optional(),
    opcion_d: z.string().max(255).nullable().optional(),
    respuesta_correcta: z.string().min(1).max(255).optional(),
    respuesta_correcta_a: z.string().max(255).nullable().optional(),
    respuesta_correcta_b: z.string().max(255).nullable().optional(),
    respuesta_correcta_c: z.string().max(255).nullable().optional(),
    respuesta_correcta_d: z.string().max(255).nullable().optional(),
    explicacion: z.string().nullable().optional(),
    puntos: numberFromBody("puntos").pipe(z.number().min(0.01).max(10000)).optional(),
    orden: numberFromBody("orden").pipe(z.number().int().min(1).max(10000)).optional(),
    estado: z.enum(["activo", "inactivo"]).optional(),
  })
  .strict()
  .refine((obj) => Object.keys(obj).length > 0, { message: "Debes enviar al menos un campo para actualizar" });

export const startQuizBodySchema = z.object({}).strict();

export const submitQuizBodySchema = z
  .object({
    respuestas: z
      .array(
        z
          .object({
            pregunta_id: z.number().int().positive(),
            respuesta_usuario: z.string().max(20000).nullable().optional(),
          })
          .strict()
      )
      .min(1, "Debes enviar respuestas"),
  })
  .strict();
