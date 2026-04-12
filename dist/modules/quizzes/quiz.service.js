"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizService = void 0;
const httpErrors_1 = require("../../common/errors/httpErrors");
const db_1 = require("../../config/db");
const quiz_repository_1 = require("./quiz.repository");
function parseMysqlDatetime(dt) {
    if (!dt)
        return null;
    const d = new Date(dt.replace(" ", "T"));
    return Number.isNaN(d.getTime()) ? null : d;
}
function nowIsWithinWindow(quiz) {
    const now = new Date();
    const open = parseMysqlDatetime(quiz.fecha_apertura);
    const close = parseMysqlDatetime(quiz.fecha_cierre);
    if (open && now.getTime() < open.getTime())
        return { ok: false, message: "El quiz aún no está disponible" };
    if (close && now.getTime() > close.getTime())
        return { ok: false, message: "El quiz ya está cerrado" };
    return { ok: true };
}
function normalizeAnswer(s) {
    return (s ?? "").trim().toLowerCase();
}
function resolvedCorrectAnswer(question) {
    if (question.tipo !== "opcion_unica")
        return question.respuesta_correcta;
    const byLetter = {
        a: question.opcion_a,
        b: question.opcion_b,
        c: question.opcion_c,
        d: question.opcion_d,
    };
    const correct = normalizeAnswer(question.respuesta_correcta);
    return byLetter[correct]?.trim() || question.respuesta_correcta;
}
class QuizService {
    constructor() {
        this.repo = new quiz_repository_1.QuizRepository();
    }
    async listByCourse(requester, courseId) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        if (requester.role === "admin")
            return this.repo.listQuizzes(courseId);
        if (requester.role === "docente") {
            this.assertCanManage(requester, course.docente_id);
            return this.repo.listQuizzes(courseId);
        }
        // estudiante: solo publicados + requiere inscripción + curso publicado
        if (course.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
        if (!enrolled)
            throw (0, httpErrors_1.forbidden)("No tienes acceso a este curso");
        return this.repo.listQuizzes(courseId, "publicado");
    }
    async getQuiz(requester, courseId, quizId) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        const quiz = await this.repo.findQuizById(courseId, quizId);
        if (!quiz)
            throw (0, httpErrors_1.notFound)("Quiz no encontrado");
        if (requester.role === "admin")
            return quiz;
        if (requester.role === "docente") {
            this.assertCanManage(requester, course.docente_id);
            return quiz;
        }
        if (course.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Quiz no encontrado");
        const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
        if (!enrolled)
            throw (0, httpErrors_1.forbidden)("No tienes acceso a este curso");
        if (quiz.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Quiz no encontrado");
        return quiz;
    }
    async createQuiz(requester, courseId, input) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        const estado = input.estado ?? "borrador";
        const id = await (0, db_1.withTransaction)(async (conn) => {
            return this.repo.createQuiz(conn, courseId, {
                curso_id: courseId,
                modulo_id: input.modulo_id ?? null,
                titulo: (input.titulo ?? "").trim(),
                descripcion: input.descripcion ?? null,
                instrucciones: input.instrucciones ?? null,
                puntaje_total: String(input.puntaje_total ?? 100),
                tiempo_limite_minutos: input.tiempo_limite_minutos ?? null,
                intentos_permitidos: input.intentos_permitidos ?? 1,
                fecha_apertura: input.fecha_apertura ?? null,
                fecha_cierre: input.fecha_cierre ?? null,
                mostrar_resultado_inmediato: input.mostrar_resultado_inmediato ? 1 : 0,
                estado,
                created_at: "",
                updated_at: "",
            });
        });
        const created = await this.repo.findQuizById(courseId, id);
        if (!created)
            throw new Error("No se pudo crear el quiz");
        return created;
    }
    async updateQuiz(requester, courseId, quizId, input) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        await (0, db_1.withTransaction)(async (conn) => {
            const affected = await this.repo.updateQuiz(conn, courseId, quizId, {
                ...input,
                titulo: input.titulo?.trim(),
                mostrar_resultado_inmediato: input.mostrar_resultado_inmediato === undefined ? undefined : input.mostrar_resultado_inmediato ? 1 : 0,
                puntaje_total: input.puntaje_total === undefined ? undefined : String(input.puntaje_total),
            });
            if (affected === 0)
                throw (0, httpErrors_1.notFound)("Quiz no encontrado");
        });
        const updated = await this.repo.findQuizById(courseId, quizId);
        if (!updated)
            throw (0, httpErrors_1.notFound)("Quiz no encontrado");
        return updated;
    }
    async patchStatus(requester, courseId, quizId, estado) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        await (0, db_1.withTransaction)(async (conn) => {
            const affected = await this.repo.updateQuizStatus(conn, courseId, quizId, estado);
            if (affected === 0)
                throw (0, httpErrors_1.notFound)("Quiz no encontrado");
        });
        const updated = await this.repo.findQuizById(courseId, quizId);
        if (!updated)
            throw (0, httpErrors_1.notFound)("Quiz no encontrado");
        return updated;
    }
    async listQuestions(requester, courseId, quizId) {
        const quiz = await this.getQuiz(requester, courseId, quizId);
        // estudiantes no deben ver respuestas_correcta
        if (requester.role === "estudiante")
            throw (0, httpErrors_1.forbidden)("No autorizado");
        return this.repo.listQuestions(quiz.id);
    }
    async createQuestion(requester, courseId, quizId, input) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        const quiz = await this.repo.findQuizById(courseId, quizId);
        if (!quiz)
            throw (0, httpErrors_1.notFound)("Quiz no encontrado");
        this.validateQuestion(input);
        const id = await (0, db_1.withTransaction)(async (conn) => {
            return this.repo.createQuestion(conn, quizId, {
                quiz_id: quizId,
                enunciado: input.enunciado.trim(),
                tipo: input.tipo,
                opcion_a: input.opcion_a ?? null,
                opcion_b: input.opcion_b ?? null,
                opcion_c: input.opcion_c ?? null,
                opcion_d: input.opcion_d ?? null,
                respuesta_correcta: input.respuesta_correcta.trim(),
                explicacion: input.explicacion ?? null,
                puntos: String(input.puntos ?? 1),
                orden: input.orden ?? 1,
                estado: input.estado ?? "activo",
                created_at: "",
                updated_at: "",
                id: 0,
            });
        });
        const questions = await this.repo.listQuestions(quizId);
        const created = questions.find((q) => q.id === id);
        if (!created)
            throw new Error("No se pudo crear la pregunta");
        return created;
    }
    async updateQuestion(requester, courseId, quizId, questionId, input) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        const quiz = await this.repo.findQuizById(courseId, quizId);
        if (!quiz)
            throw (0, httpErrors_1.notFound)("Quiz no encontrado");
        if (input.tipo || input.respuesta_correcta || input.opcion_a || input.opcion_b || input.opcion_c || input.opcion_d) {
            // validación con el estado final parcial (best-effort)
            const current = (await this.repo.listQuestions(quizId)).find((q) => q.id === questionId);
            if (!current)
                throw (0, httpErrors_1.notFound)("Pregunta no encontrada");
            this.validateQuestion({
                enunciado: input.enunciado ?? current.enunciado,
                tipo: input.tipo ?? current.tipo,
                opcion_a: input.opcion_a ?? current.opcion_a,
                opcion_b: input.opcion_b ?? current.opcion_b,
                opcion_c: input.opcion_c ?? current.opcion_c,
                opcion_d: input.opcion_d ?? current.opcion_d,
                respuesta_correcta: input.respuesta_correcta ?? current.respuesta_correcta,
                explicacion: input.explicacion ?? current.explicacion,
                puntos: input.puntos ?? Number(current.puntos),
                orden: input.orden ?? current.orden,
                estado: input.estado ?? current.estado,
            });
        }
        await (0, db_1.withTransaction)(async (conn) => {
            const affected = await this.repo.updateQuestion(conn, quizId, questionId, {
                ...input,
                enunciado: input.enunciado?.trim(),
                respuesta_correcta: input.respuesta_correcta?.trim(),
                puntos: input.puntos === undefined ? undefined : String(input.puntos),
            });
            if (affected === 0)
                throw (0, httpErrors_1.notFound)("Pregunta no encontrada");
        });
        const questions = await this.repo.listQuestions(quizId);
        const updated = questions.find((q) => q.id === questionId);
        if (!updated)
            throw (0, httpErrors_1.notFound)("Pregunta no encontrada");
        return updated;
    }
    async deleteQuestion(requester, courseId, quizId, questionId) {
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        this.assertCanManage(requester, course.docente_id);
        await (0, db_1.withTransaction)(async (conn) => {
            const affected = await this.repo.softDeleteQuestion(conn, quizId, questionId);
            if (affected === 0)
                throw (0, httpErrors_1.notFound)("Pregunta no encontrada");
        });
    }
    async startQuiz(requester, courseId, quizId) {
        if (requester.role !== "estudiante")
            throw (0, httpErrors_1.forbidden)("No autorizado");
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        if (course.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
        if (!enrolled)
            throw (0, httpErrors_1.forbidden)("No tienes acceso a este curso");
        const quiz = await this.repo.findQuizById(courseId, quizId);
        if (!quiz)
            throw (0, httpErrors_1.notFound)("Quiz no encontrado");
        if (quiz.estado === "cerrado")
            throw (0, httpErrors_1.forbidden)("El quiz está cerrado");
        if (quiz.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Quiz no encontrado");
        const window = nowIsWithinWindow(quiz);
        if (!window.ok)
            throw (0, httpErrors_1.forbidden)(window.message ?? "No disponible");
        const preguntas = await this.repo.listActiveQuestions(quizId);
        if (preguntas.length === 0)
            throw (0, httpErrors_1.badRequest)("Este quiz no tiene preguntas activas");
        const { intentoId, numeroIntento } = await (0, db_1.withTransaction)(async (conn) => {
            const used = await this.repo.countAttempts(conn, quizId, requester.userId);
            if (used >= quiz.intentos_permitidos)
                throw (0, httpErrors_1.forbidden)("Ya alcanzaste el límite de intentos");
            const numero = used + 1;
            const id = await this.repo.createAttempt(conn, quizId, requester.userId, numero);
            return { intentoId: id, numeroIntento: numero };
        });
        const preguntasPublic = preguntas.map(({ respuesta_correcta, ...rest }) => rest);
        return { intento_id: intentoId, quiz, preguntas: preguntasPublic, numero_intento: numeroIntento };
    }
    async submitQuiz(requester, courseId, quizId, attemptId, input) {
        if (requester.role !== "estudiante")
            throw (0, httpErrors_1.forbidden)("No autorizado");
        const course = await this.repo.findCourse(courseId);
        if (!course)
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        if (course.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Curso no encontrado");
        const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
        if (!enrolled)
            throw (0, httpErrors_1.forbidden)("No tienes acceso a este curso");
        const quiz = await this.repo.findQuizById(courseId, quizId);
        if (!quiz)
            throw (0, httpErrors_1.notFound)("Quiz no encontrado");
        if (quiz.estado === "cerrado")
            throw (0, httpErrors_1.forbidden)("El quiz está cerrado");
        if (quiz.estado !== "publicado")
            throw (0, httpErrors_1.notFound)("Quiz no encontrado");
        const window = nowIsWithinWindow(quiz);
        if (!window.ok)
            throw (0, httpErrors_1.forbidden)(window.message ?? "No disponible");
        const result = await (0, db_1.withTransaction)(async (conn) => {
            const intento = await this.repo.findAttemptById(conn, attemptId);
            if (!intento)
                throw (0, httpErrors_1.notFound)("Intento no encontrado");
            if (intento.quiz_id !== quizId)
                throw (0, httpErrors_1.badRequest)("Intento inválido");
            if (intento.estudiante_id !== requester.userId)
                throw (0, httpErrors_1.forbidden)("No autorizado");
            if (intento.completado === 1)
                throw (0, httpErrors_1.forbidden)("Este intento ya fue enviado");
            const checks = await this.repo.listAnswerChecks(conn, quizId);
            const answersByQuestion = new Map();
            input.respuestas.forEach((r) => {
                answersByQuestion.set(r.pregunta_id, r.respuesta_usuario ?? null);
            });
            let score = 0;
            const detalle = [];
            for (const c of checks) {
                const user = answersByQuestion.get(c.pregunta_id) ?? null;
                const answerKey = resolvedCorrectAnswer(c);
                const correct = normalizeAnswer(user) === normalizeAnswer(answerKey);
                const puntosPregunta = Number(c.puntos);
                const puntosObtenidos = correct ? puntosPregunta : 0;
                score += puntosObtenidos;
                await this.repo.upsertAttemptAnswer(conn, attemptId, c.pregunta_id, user, correct ? 1 : 0, puntosObtenidos);
                detalle.push({
                    pregunta_id: c.pregunta_id,
                    respuesta_usuario: user,
                    es_correcta: correct,
                    puntos_obtenidos: puntosObtenidos,
                    respuesta_correcta: quiz.mostrar_resultado_inmediato ? answerKey : undefined,
                    explicacion: quiz.mostrar_resultado_inmediato ? c.explicacion : undefined,
                });
            }
            await this.repo.completeAttempt(conn, attemptId, score);
            const updatedAttempt = await this.repo.findAttemptById(conn, attemptId);
            if (!updatedAttempt)
                throw new Error("No se pudo completar el intento");
            return { updatedAttempt, score, detalle };
        });
        return {
            intento: result.updatedAttempt,
            mostrar_resultado: quiz.mostrar_resultado_inmediato === 1,
            puntaje_obtenido: result.score,
            puntaje_total: Number(quiz.puntaje_total),
            detalle: quiz.mostrar_resultado_inmediato === 1 ? result.detalle : undefined,
        };
    }
    validateQuestion(input) {
        if (input.tipo === "verdadero_falso") {
            const v = normalizeAnswer(input.respuesta_correcta);
            if (v !== "verdadero" && v !== "falso") {
                throw (0, httpErrors_1.badRequest)("Para verdadero/falso, respuesta_correcta debe ser 'verdadero' o 'falso'");
            }
        }
        if (input.tipo === "opcion_unica") {
            const opts = [input.opcion_a, input.opcion_b, input.opcion_c, input.opcion_d].filter((x) => (x ?? "").trim().length > 0);
            if (opts.length < 2)
                throw (0, httpErrors_1.badRequest)("La pregunta de opción única requiere al menos 2 opciones");
            const rc = normalizeAnswer(input.respuesta_correcta);
            const normalized = new Set(opts.map((o) => normalizeAnswer(o)));
            if (!normalized.has(rc)) {
                // también permitimos "A/B/C/D"
                if (!["a", "b", "c", "d"].includes(rc))
                    throw (0, httpErrors_1.badRequest)("respuesta_correcta debe coincidir con una opción");
            }
        }
        if (input.tipo === "respuesta_corta") {
            if (input.respuesta_correcta.trim().length === 0)
                throw (0, httpErrors_1.badRequest)("respuesta_correcta es requerida");
        }
    }
    assertCanManage(requester, docenteId) {
        const isAdmin = requester.role === "admin";
        const isOwnerTeacher = requester.role === "docente" && requester.userId === docenteId;
        if (!isAdmin && !isOwnerTeacher)
            throw (0, httpErrors_1.forbidden)("No autorizado");
    }
}
exports.QuizService = QuizService;
