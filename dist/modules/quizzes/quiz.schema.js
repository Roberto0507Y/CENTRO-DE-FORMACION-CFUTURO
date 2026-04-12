"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitQuizBodySchema = exports.startQuizBodySchema = exports.updateQuestionBodySchema = exports.createQuestionBodySchema = exports.patchQuizStatusBodySchema = exports.updateQuizBodySchema = exports.createQuizBodySchema = exports.attemptParamsSchema = exports.questionIdParamsSchema = exports.quizIdParamsSchema = exports.courseIdParamsSchema = void 0;
const zod_1 = require("zod");
const mysqlDatetime = zod_1.z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/, "Formato DATETIME inválido");
const idFromParam = (name) => zod_1.z.preprocess((v) => Number(v), zod_1.z.number().int().positive({ message: `${name} inválido` }));
const numberFromBody = (name) => zod_1.z.preprocess((v) => {
    if (typeof v === "number")
        return v;
    if (typeof v !== "string")
        return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
}, zod_1.z.number({ message: `${name} debe ser un número` }));
const booleanFromBody = () => zod_1.z.preprocess((v) => {
    if (typeof v === "boolean")
        return v;
    if (typeof v === "number")
        return Boolean(v);
    if (typeof v !== "string")
        return v;
    const t = v.trim().toLowerCase();
    if (t === "true" || t === "1" || t === "on")
        return true;
    if (t === "false" || t === "0" || t === "off")
        return false;
    return v;
}, zod_1.z.boolean());
exports.courseIdParamsSchema = zod_1.z.object({ courseId: idFromParam("courseId") }).strict();
exports.quizIdParamsSchema = zod_1.z
    .object({ courseId: idFromParam("courseId"), quizId: idFromParam("quizId") })
    .strict();
exports.questionIdParamsSchema = zod_1.z
    .object({
    courseId: idFromParam("courseId"),
    quizId: idFromParam("quizId"),
    questionId: idFromParam("questionId"),
})
    .strict();
exports.attemptParamsSchema = zod_1.z
    .object({
    courseId: idFromParam("courseId"),
    quizId: idFromParam("quizId"),
    attemptId: idFromParam("attemptId"),
})
    .strict();
exports.createQuizBodySchema = zod_1.z
    .object({
    modulo_id: zod_1.z.number().int().positive().nullable().optional(),
    titulo: zod_1.z.string().min(1).max(150),
    descripcion: zod_1.z.string().nullable().optional(),
    instrucciones: zod_1.z.string().nullable().optional(),
    puntaje_total: numberFromBody("puntaje_total").pipe(zod_1.z.number().min(0.01).max(100000)).optional(),
    tiempo_limite_minutos: numberFromBody("tiempo_limite_minutos").pipe(zod_1.z.number().int().min(1).max(600)).nullable().optional(),
    intentos_permitidos: numberFromBody("intentos_permitidos").pipe(zod_1.z.number().int().min(1).max(20)).optional(),
    fecha_apertura: mysqlDatetime.nullable().optional(),
    fecha_cierre: mysqlDatetime.nullable().optional(),
    mostrar_resultado_inmediato: booleanFromBody().optional(),
    estado: zod_1.z.enum(["borrador", "publicado", "cerrado"]).optional(),
})
    .strict();
exports.updateQuizBodySchema = zod_1.z
    .object({
    modulo_id: zod_1.z.number().int().positive().nullable().optional(),
    titulo: zod_1.z.string().min(1).max(150).optional(),
    descripcion: zod_1.z.string().nullable().optional(),
    instrucciones: zod_1.z.string().nullable().optional(),
    puntaje_total: numberFromBody("puntaje_total").pipe(zod_1.z.number().min(0.01).max(100000)).optional(),
    tiempo_limite_minutos: numberFromBody("tiempo_limite_minutos").pipe(zod_1.z.number().int().min(1).max(600)).nullable().optional(),
    intentos_permitidos: numberFromBody("intentos_permitidos").pipe(zod_1.z.number().int().min(1).max(20)).optional(),
    fecha_apertura: mysqlDatetime.nullable().optional(),
    fecha_cierre: mysqlDatetime.nullable().optional(),
    mostrar_resultado_inmediato: booleanFromBody().optional(),
})
    .strict()
    .refine((obj) => Object.keys(obj).length > 0, { message: "Debes enviar al menos un campo para actualizar" });
exports.patchQuizStatusBodySchema = zod_1.z.object({ estado: zod_1.z.enum(["borrador", "publicado", "cerrado"]) }).strict();
exports.createQuestionBodySchema = zod_1.z
    .object({
    enunciado: zod_1.z.string().min(1).max(20000),
    tipo: zod_1.z.enum(["opcion_unica", "verdadero_falso", "respuesta_corta"]),
    opcion_a: zod_1.z.string().max(255).nullable().optional(),
    opcion_b: zod_1.z.string().max(255).nullable().optional(),
    opcion_c: zod_1.z.string().max(255).nullable().optional(),
    opcion_d: zod_1.z.string().max(255).nullable().optional(),
    respuesta_correcta: zod_1.z.string().min(1).max(255),
    explicacion: zod_1.z.string().nullable().optional(),
    puntos: numberFromBody("puntos").pipe(zod_1.z.number().min(0.01).max(10000)).optional(),
    orden: numberFromBody("orden").pipe(zod_1.z.number().int().min(1).max(10000)).optional(),
    estado: zod_1.z.enum(["activo", "inactivo"]).optional(),
})
    .strict();
exports.updateQuestionBodySchema = zod_1.z
    .object({
    enunciado: zod_1.z.string().min(1).max(20000).optional(),
    tipo: zod_1.z.enum(["opcion_unica", "verdadero_falso", "respuesta_corta"]).optional(),
    opcion_a: zod_1.z.string().max(255).nullable().optional(),
    opcion_b: zod_1.z.string().max(255).nullable().optional(),
    opcion_c: zod_1.z.string().max(255).nullable().optional(),
    opcion_d: zod_1.z.string().max(255).nullable().optional(),
    respuesta_correcta: zod_1.z.string().min(1).max(255).optional(),
    explicacion: zod_1.z.string().nullable().optional(),
    puntos: numberFromBody("puntos").pipe(zod_1.z.number().min(0.01).max(10000)).optional(),
    orden: numberFromBody("orden").pipe(zod_1.z.number().int().min(1).max(10000)).optional(),
    estado: zod_1.z.enum(["activo", "inactivo"]).optional(),
})
    .strict()
    .refine((obj) => Object.keys(obj).length > 0, { message: "Debes enviar al menos un campo para actualizar" });
exports.startQuizBodySchema = zod_1.z.object({}).strict();
exports.submitQuizBodySchema = zod_1.z
    .object({
    respuestas: zod_1.z
        .array(zod_1.z
        .object({
        pregunta_id: zod_1.z.number().int().positive(),
        respuesta_usuario: zod_1.z.string().max(20000).nullable().optional(),
    })
        .strict())
        .min(1, "Debes enviar respuestas"),
})
    .strict();
