import { badRequest, forbidden, notFound } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { withTransaction } from "../../config/db";
import { QuizRepository } from "./quiz.repository";
import {
  admissionCanTakeExam,
  admissionNeedsNewPayment,
  admissionPassed,
  admissionPercent,
  remainingAdmissionAttempts,
} from "./quiz-admission";
import type {
  AdmissionAttemptAnswerItem,
  AdmissionAttemptDetail,
  AdmissionResultItem,
  AdmissionStudentDetail,
  AttemptResult,
  CreateQuestionInput,
  UpdateAdmissionAttemptScoreInput,
  CreateQuizInput,
  Quiz,
  QuizQuestion,
  QuizQuestionPublic,
  QuizVariant,
  QuestionStatus,
  QuizStatus,
  SubmitQuizInput,
  UpdateQuestionInput,
  UpdateQuizInput,
} from "./quiz.types";

const POINT_EPSILON = 1e-9;

function roundPoints(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function formatPoints(value: number): string {
  const rounded = roundPoints(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/\.?0+$/, "");
}

function exceedsPointBudget(total: number, limit: number): boolean {
  return total - limit > POINT_EPSILON;
}

function parseMysqlDatetime(dt: string | null): Date | null {
  if (!dt) return null;
  const d = new Date(dt.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

function nowIsWithinWindow(quiz: Quiz): { ok: boolean; message?: string } {
  const now = new Date();
  const open = parseMysqlDatetime(quiz.fecha_apertura);
  const close = parseMysqlDatetime(quiz.fecha_cierre);
  if (open && now.getTime() < open.getTime()) return { ok: false, message: "El quiz aún no está disponible" };
  if (close && now.getTime() > close.getTime()) return { ok: false, message: "El quiz ya está cerrado" };
  return { ok: true };
}

function normalizeAnswer(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function resolvedCorrectAnswer(question: {
  tipo: QuizQuestion["tipo"];
  opcion_a: string | null;
  opcion_b: string | null;
  opcion_c: string | null;
  opcion_d: string | null;
  respuesta_correcta: string;
  respuesta_correcta_a?: string | null;
  respuesta_correcta_b?: string | null;
  respuesta_correcta_c?: string | null;
  respuesta_correcta_d?: string | null;
}, variant?: QuizVariant | null): string {
  const variantAnswers: Record<QuizVariant, string | null | undefined> = {
    A: question.respuesta_correcta_a,
    B: question.respuesta_correcta_b,
    C: question.respuesta_correcta_c,
    D: question.respuesta_correcta_d,
  };
  const rawAnswer = variant ? variantAnswers[variant]?.trim() || question.respuesta_correcta : question.respuesta_correcta;
  if (question.tipo !== "opcion_unica") return rawAnswer;

  const byLetter: Record<string, string | null> = {
    a: question.opcion_a,
    b: question.opcion_b,
    c: question.opcion_c,
    d: question.opcion_d,
  };

  const correct = normalizeAnswer(rawAnswer);
  return byLetter[correct]?.trim() || rawAnswer;
}

function randomVariant(): QuizVariant {
  const variants: QuizVariant[] = ["A", "B", "C", "D"];
  return variants[Math.floor(Math.random() * variants.length)] ?? "A";
}

function hasAnyVariantAnswer(input: Pick<
  CreateQuestionInput,
  "respuesta_correcta_a" | "respuesta_correcta_b" | "respuesta_correcta_c" | "respuesta_correcta_d"
>): boolean {
  return [
    input.respuesta_correcta_a,
    input.respuesta_correcta_b,
    input.respuesta_correcta_c,
    input.respuesta_correcta_d,
  ].some((value) => (value ?? "").trim().length > 0);
}

function normalizeOptionalAnswer(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  return value?.trim() || null;
}

function isDuplicateEntry(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "ER_DUP_ENTRY";
}

function admissionVariantPaths(): QuizVariant[] {
  return ["A", "B", "C", "D"];
}

function questionMatchesVariantPath(
  question: Pick<QuizQuestion, "variante_objetivo" | "estado">,
  variant: QuizVariant
): boolean {
  return question.estado === "activo" && (!question.variante_objetivo || question.variante_objetivo === variant);
}

export class QuizService {
  private readonly repo = new QuizRepository();

  async listByCourse(requester: AuthContext, courseId: number): Promise<Quiz[]> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");

    if (requester.role === "admin") return this.repo.listQuizzes(courseId);
    if (requester.role === "docente") {
      this.assertCanManage(requester, course.docente_id);
      return this.repo.listQuizzes(courseId);
    }

    // estudiante: quizzes regulares requieren inscripción; admisión puede verse antes de comprar.
    if (course.estado !== "publicado") throw notFound("Curso no encontrado");
    const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
    if (!enrolled) {
      const admission = await this.getAdmissionStatus(requester, courseId);
      if (admission.enabled && admission.quiz && admission.can_take_exam) return [admission.quiz];
      throw forbidden("No tienes acceso a este curso");
    }
    const quizzes = await this.repo.listQuizzes(courseId, "publicado");
    return quizzes.filter((quiz) => quiz.tipo !== "admision");
  }

  async getQuiz(requester: AuthContext, courseId: number, quizId: number): Promise<Quiz> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");

    const quiz = await this.repo.findQuizById(courseId, quizId);
    if (!quiz) throw notFound("Quiz no encontrado");

    if (requester.role === "admin") return quiz;
    if (requester.role === "docente") {
      this.assertCanManage(requester, course.docente_id);
      return quiz;
    }

    if (course.estado !== "publicado") throw notFound("Quiz no encontrado");
    const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
    if (!enrolled) throw forbidden("No tienes acceso a este curso");
    if (quiz.estado !== "publicado") throw notFound("Quiz no encontrado");
    return quiz;
  }

  async getAdmissionStatus(requester: AuthContext, courseId: number): Promise<{
    enabled: boolean;
    quiz: Quiz | null;
    requires_payment: boolean;
    has_paid: boolean;
    passed: boolean;
    can_take_exam: boolean;
    can_buy_course: boolean;
    attempts_used: number;
    attempts_remaining: number;
    latest_paid_at: string | null;
    message: string | null;
  }> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    if (course.estado !== "publicado" && requester.role === "estudiante") {
      throw notFound("Curso no encontrado");
    }

    const quiz = await this.repo.findPublishedAdmissionQuiz(courseId);
    if (!quiz) {
      return {
        enabled: false,
        quiz: null,
        requires_payment: false,
        has_paid: true,
        passed: true,
        can_take_exam: false,
        can_buy_course: true,
        attempts_used: 0,
        attempts_remaining: 0,
        latest_paid_at: null,
        message: null,
      };
    }

    const requiresPayment = Number(quiz.precio_admision) > 0;
    const latestPaidAt = requiresPayment
      ? await this.repo.latestPaidAdmissionAt(requester.userId, courseId)
      : null;
    const hasPaid = !requiresPayment || Boolean(latestPaidAt);
    const bestScore = await this.repo.bestCompletedAttemptScoreForQuiz(quiz.id, requester.userId);
    const passed =
      bestScore !== null &&
      admissionPassed(bestScore, Number(quiz.puntaje_total), Number(quiz.porcentaje_aprobacion));
    const attemptsUsed = await withTransaction((conn) =>
      this.repo.countAttemptsSince(conn, quiz.id, requester.userId, latestPaidAt)
    );
    const attemptsRemaining = remainingAdmissionAttempts(Number(quiz.intentos_permitidos), attemptsUsed);
    const availability = nowIsWithinWindow(quiz);
    const needsNewPayment = admissionNeedsNewPayment({
      passed,
      attemptsRemaining,
      requiresPaymentRetry: quiz.requiere_pago_reintento === 1,
    });
    const canTakeExam = admissionCanTakeExam({
      passed,
      hasPaid,
      attemptsRemaining,
      available: availability.ok,
    });

    return {
      enabled: true,
      quiz,
      requires_payment: requiresPayment,
      has_paid: hasPaid,
      passed,
      can_take_exam: canTakeExam,
      can_buy_course: passed,
      attempts_used: attemptsUsed,
      attempts_remaining: attemptsRemaining,
      latest_paid_at: latestPaidAt,
      message: passed
        ? "Examen de admisión aprobado. Ya puedes comprar el curso."
        : !hasPaid || needsNewPayment
          ? "Debes pagar el examen de admisión para habilitar tus oportunidades."
          : !availability.ok
            ? availability.message ?? "El examen no está disponible."
            : attemptsRemaining <= 0
              ? "Ya alcanzaste el límite de oportunidades."
              : null,
    };
  }

  async listAdmissionResults(
    requester: AuthContext,
    courseId: number,
    quizId: number
  ): Promise<AdmissionResultItem[]> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);

    const quiz = await this.repo.findQuizById(courseId, quizId);
    if (!quiz) throw notFound("Quiz no encontrado");
    if (quiz.tipo !== "admision") {
      throw badRequest("Este reporte solo aplica a exámenes de admisión");
    }

    return this.repo.listAdmissionResults(courseId, quizId);
  }

  async getAdmissionStudentDetail(
    requester: AuthContext,
    courseId: number,
    quizId: number,
    studentId: number
  ): Promise<AdmissionStudentDetail> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);

    const quiz = await this.repo.findQuizById(courseId, quizId);
    if (!quiz) throw notFound("Quiz no encontrado");
    if (quiz.tipo !== "admision") {
      throw badRequest("Este detalle solo aplica a exámenes de admisión");
    }

    const summary = await this.repo.findAdmissionResultForStudent(courseId, quizId, studentId);
    if (!summary) {
      throw notFound("No hay resultados de admisión para este alumno");
    }

    const attempts = await this.repo.listAdmissionAttemptsForStudent(quizId, studentId);
    const attemptIds = attempts.map((attempt) => attempt.id);
    const answerRows = await this.repo.listAdmissionAttemptAnswers(attemptIds);
    const answersByAttempt = new Map<number, AdmissionAttemptAnswerItem[]>();
    const attemptVariantById = new Map<number, QuizVariant | null>(
      attempts.map((attempt) => [attempt.id, attempt.variante] as const)
    );

    for (const row of answerRows) {
      const attemptVariant = attemptVariantById.get(row.intento_id) ?? null;
      const current = answersByAttempt.get(row.intento_id) ?? [];
      current.push({
        intento_id: row.intento_id,
        pregunta_id: row.pregunta_id,
        orden: row.orden,
        enunciado: row.enunciado,
        tipo: row.tipo,
        respuesta_usuario: row.respuesta_usuario,
        respuesta_correcta_publicada: resolvedCorrectAnswer(
          {
            tipo: row.tipo,
            opcion_a: row.opcion_a,
            opcion_b: row.opcion_b,
            opcion_c: row.opcion_c,
            opcion_d: row.opcion_d,
            respuesta_correcta: row.respuesta_correcta,
            respuesta_correcta_a: row.respuesta_correcta_a,
            respuesta_correcta_b: row.respuesta_correcta_b,
            respuesta_correcta_c: row.respuesta_correcta_c,
            respuesta_correcta_d: row.respuesta_correcta_d,
          },
          attemptVariant
        ),
        es_correcta: row.es_correcta === 1,
        puntos_pregunta: Number(row.puntos_pregunta ?? 0),
        puntos_obtenidos: Number(row.puntos_obtenidos ?? 0),
        explicacion: row.explicacion,
      });
      answersByAttempt.set(row.intento_id, current);
    }

    const totalPoints = Number(quiz.puntaje_total);
    const approvalThreshold = Number(quiz.porcentaje_aprobacion);
    const attemptsDetail: AdmissionAttemptDetail[] = attempts.map((attempt) => {
      const score = attempt.puntaje_obtenido === null ? null : Number(attempt.puntaje_obtenido);
      const percentage = score === null ? null : admissionPercent(score, totalPoints);
      return {
        id: attempt.id,
        estudiante_id: attempt.estudiante_id,
        numero_intento: attempt.numero_intento,
        variante: attempt.variante,
        puntaje_obtenido: score,
        puntaje_total: totalPoints,
        porcentaje_obtenido: percentage,
        porcentaje_aprobacion: approvalThreshold,
        aprobado: score === null ? false : admissionPassed(score, totalPoints, approvalThreshold),
        completado: attempt.completado === 1,
        fecha_inicio: attempt.fecha_inicio,
        fecha_fin: attempt.fecha_fin,
        created_at: attempt.created_at,
        updated_at: attempt.updated_at,
        respuestas: answersByAttempt.get(attempt.id) ?? [],
      };
    });

    return {
      ...summary,
      quiz_id: quiz.id,
      quiz_titulo: quiz.titulo,
      intentos_permitidos: quiz.intentos_permitidos,
      requiere_pago_reintento: quiz.requiere_pago_reintento === 1,
      intentos_detalle: attemptsDetail,
    };
  }

  async updateAdmissionAttemptScore(
    requester: AuthContext,
    courseId: number,
    quizId: number,
    attemptId: number,
    input: UpdateAdmissionAttemptScoreInput
  ): Promise<AdmissionStudentDetail> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);

    const quiz = await this.repo.findQuizById(courseId, quizId);
    if (!quiz) throw notFound("Quiz no encontrado");
    if (quiz.tipo !== "admision") {
      throw badRequest("Esta acción solo aplica a exámenes de admisión");
    }

    const nextScore = roundPoints(Number(input.puntaje_obtenido));
    const totalPoints = Number(quiz.puntaje_total);
    if (!Number.isFinite(nextScore) || nextScore < 0) {
      throw badRequest("La nota debe ser un número válido mayor o igual a 0");
    }
    if (nextScore - totalPoints > POINT_EPSILON) {
      throw badRequest(`La nota no puede exceder ${formatPoints(totalPoints)} pts.`);
    }

    const studentId = await withTransaction(async (conn) => {
      const attempt = await this.repo.findAttemptById(conn, attemptId);
      if (!attempt) throw notFound("Intento no encontrado");
      if (attempt.quiz_id !== quizId) throw badRequest("Intento inválido para este examen");
      if (attempt.completado !== 1) {
        throw badRequest("Solo puedes corregir intentos completados");
      }

      const affected = await this.repo.updateAttemptScore(conn, attemptId, nextScore);
      if (affected === 0) throw notFound("Intento no encontrado");
      return attempt.estudiante_id;
    });

    return this.getAdmissionStudentDetail(requester, courseId, quizId, studentId);
  }

  async createQuiz(requester: AuthContext, courseId: number, input: CreateQuizInput): Promise<Quiz> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);

    const estado: QuizStatus = input.estado ?? "borrador";
    const id = await withTransaction(async (conn) => {
      return this.repo.createQuiz(conn, courseId, {
        curso_id: courseId,
        modulo_id: input.modulo_id ?? null,
        titulo: (input.titulo ?? "").trim(),
        descripcion: input.descripcion ?? null,
        instrucciones: input.instrucciones ?? null,
        tipo: input.tipo ?? "regular",
        puntaje_total: String(input.puntaje_total ?? 100),
        porcentaje_aprobacion: String(input.porcentaje_aprobacion ?? 60),
        precio_admision: String(input.precio_admision ?? 0),
        payment_link_admision: input.payment_link_admision ?? null,
        tiempo_limite_minutos: input.tiempo_limite_minutos ?? null,
        intentos_permitidos: input.intentos_permitidos ?? 1,
        requiere_pago_reintento: input.requiere_pago_reintento ? 1 : 0,
        fecha_apertura: input.fecha_apertura ?? null,
        fecha_cierre: input.fecha_cierre ?? null,
        mostrar_resultado_inmediato: input.mostrar_resultado_inmediato ? 1 : 0,
        estado,
        created_at: "",
        updated_at: "",
      } as unknown as Omit<Quiz, "id" | "created_at" | "updated_at">);
    });

    const created = await this.repo.findQuizById(courseId, id);
    if (!created) throw new Error("No se pudo crear el quiz");
    return created;
  }

  async updateQuiz(requester: AuthContext, courseId: number, quizId: number, input: UpdateQuizInput): Promise<Quiz> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);
    const quiz = await this.repo.findQuizById(courseId, quizId);
    if (!quiz) throw notFound("Quiz no encontrado");

    if (input.puntaje_total !== undefined) {
      if (quiz.tipo === "admision") {
        await this.assertQuizTotalFitsAllVariants(quiz, quizId, input.puntaje_total);
      } else {
        const activePoints = await this.repo.sumActiveQuestionPoints(quizId);
        if (exceedsPointBudget(activePoints, input.puntaje_total)) {
          throw badRequest(
            `El puntaje total no puede ser menor que la suma de preguntas activas (${formatPoints(activePoints)} pts).`
          );
        }
      }
    }

    await withTransaction(async (conn) => {
      const affected = await this.repo.updateQuiz(conn, courseId, quizId, {
        ...input,
        titulo: input.titulo?.trim(),
        tipo: input.tipo,
        mostrar_resultado_inmediato:
          input.mostrar_resultado_inmediato === undefined ? undefined : input.mostrar_resultado_inmediato ? 1 : 0,
        puntaje_total: input.puntaje_total === undefined ? undefined : String(input.puntaje_total),
        porcentaje_aprobacion:
          input.porcentaje_aprobacion === undefined ? undefined : String(input.porcentaje_aprobacion),
        precio_admision: input.precio_admision === undefined ? undefined : String(input.precio_admision),
        payment_link_admision: input.payment_link_admision,
        requiere_pago_reintento:
          input.requiere_pago_reintento === undefined ? undefined : input.requiere_pago_reintento ? 1 : 0,
      } as unknown as Partial<Omit<Quiz, "id" | "curso_id" | "created_at" | "updated_at">>);
      if (affected === 0) throw notFound("Quiz no encontrado");
    });

    const updated = await this.repo.findQuizById(courseId, quizId);
    if (!updated) throw notFound("Quiz no encontrado");
    return updated;
  }

  async patchStatus(requester: AuthContext, courseId: number, quizId: number, estado: QuizStatus): Promise<Quiz> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);

    await withTransaction(async (conn) => {
      const affected = await this.repo.updateQuizStatus(conn, courseId, quizId, estado);
      if (affected === 0) throw notFound("Quiz no encontrado");
    });

    const updated = await this.repo.findQuizById(courseId, quizId);
    if (!updated) throw notFound("Quiz no encontrado");
    return updated;
  }

  async listQuestions(requester: AuthContext, courseId: number, quizId: number): Promise<QuizQuestion[]> {
    await this.repo.ensureVariantSchema();
    const quiz = await this.getQuiz(requester, courseId, quizId);
    // estudiantes no deben ver respuestas_correcta
    if (requester.role === "estudiante") throw forbidden("No autorizado");
    return this.repo.listQuestions(quiz.id);
  }

  async createQuestion(requester: AuthContext, courseId: number, quizId: number, input: CreateQuestionInput): Promise<QuizQuestion> {
    await this.repo.ensureVariantSchema();
    const [course, quiz] = await Promise.all([
      this.repo.findCourse(courseId),
      this.repo.findQuizById(courseId, quizId),
    ]);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);
    if (!quiz) throw notFound("Quiz no encontrado");

    this.validateQuestion(input);
    await this.assertQuestionFitsBudget(
      quiz,
      quizId,
      input.estado ?? "activo",
      input.puntos ?? 1,
      undefined,
      input.variante_objetivo ?? null
    );

    const id = await withTransaction(async (conn) => {
      return this.repo.createQuestion(conn, quizId, {
        quiz_id: quizId,
        enunciado: input.enunciado.trim(),
        tipo: input.tipo,
        variante_objetivo: input.variante_objetivo ?? null,
        opcion_a: input.opcion_a ?? null,
        opcion_b: input.opcion_b ?? null,
        opcion_c: input.opcion_c ?? null,
        opcion_d: input.opcion_d ?? null,
        respuesta_correcta: input.respuesta_correcta.trim(),
        respuesta_correcta_a: input.respuesta_correcta_a?.trim() || null,
        respuesta_correcta_b: input.respuesta_correcta_b?.trim() || null,
        respuesta_correcta_c: input.respuesta_correcta_c?.trim() || null,
        respuesta_correcta_d: input.respuesta_correcta_d?.trim() || null,
        explicacion: input.explicacion ?? null,
        puntos: String(input.puntos ?? 1),
        orden: input.orden ?? 1,
        estado: input.estado ?? "activo",
        created_at: "",
        updated_at: "",
        id: 0,
      } as unknown as Omit<QuizQuestion, "id" | "created_at" | "updated_at">);
    });

    const created = await this.repo.findQuestionById(quizId, id);
    if (!created) throw new Error("No se pudo crear la pregunta");
    return created;
  }

  async updateQuestion(
    requester: AuthContext,
    courseId: number,
    quizId: number,
    questionId: number,
    input: UpdateQuestionInput
  ): Promise<QuizQuestion> {
    await this.repo.ensureVariantSchema();
    const [course, quiz, current] = await Promise.all([
      this.repo.findCourse(courseId),
      this.repo.findQuizById(courseId, quizId),
      this.repo.findQuestionById(quizId, questionId),
    ]);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);
    if (!quiz) throw notFound("Quiz no encontrado");
    if (!current) throw notFound("Pregunta no encontrada");

    const nextQuestion: CreateQuestionInput = {
      enunciado: input.enunciado ?? current.enunciado,
      tipo: input.tipo ?? current.tipo,
      variante_objetivo: input.variante_objetivo ?? current.variante_objetivo,
      opcion_a: input.opcion_a ?? current.opcion_a,
      opcion_b: input.opcion_b ?? current.opcion_b,
      opcion_c: input.opcion_c ?? current.opcion_c,
      opcion_d: input.opcion_d ?? current.opcion_d,
      respuesta_correcta: input.respuesta_correcta ?? current.respuesta_correcta,
      respuesta_correcta_a: input.respuesta_correcta_a ?? current.respuesta_correcta_a,
      respuesta_correcta_b: input.respuesta_correcta_b ?? current.respuesta_correcta_b,
      respuesta_correcta_c: input.respuesta_correcta_c ?? current.respuesta_correcta_c,
      respuesta_correcta_d: input.respuesta_correcta_d ?? current.respuesta_correcta_d,
      explicacion: input.explicacion ?? current.explicacion,
      puntos: input.puntos ?? Number(current.puntos),
      orden: input.orden ?? current.orden,
      estado: input.estado ?? current.estado,
    };

    this.validateQuestion(nextQuestion);
    await this.assertQuestionFitsBudget(
      quiz,
      quizId,
      nextQuestion.estado ?? "activo",
      nextQuestion.puntos ?? 1,
      current.id,
      nextQuestion.variante_objetivo ?? null
    );

    await withTransaction(async (conn) => {
      const affected = await this.repo.updateQuestion(conn, quizId, questionId, {
        ...input,
        enunciado: input.enunciado?.trim(),
        variante_objetivo: input.variante_objetivo,
        respuesta_correcta: input.respuesta_correcta?.trim(),
        respuesta_correcta_a: normalizeOptionalAnswer(input.respuesta_correcta_a),
        respuesta_correcta_b: normalizeOptionalAnswer(input.respuesta_correcta_b),
        respuesta_correcta_c: normalizeOptionalAnswer(input.respuesta_correcta_c),
        respuesta_correcta_d: normalizeOptionalAnswer(input.respuesta_correcta_d),
        puntos: input.puntos === undefined ? undefined : String(input.puntos),
      } as unknown as Partial<Omit<QuizQuestion, "id" | "quiz_id" | "created_at" | "updated_at">>);
      if (affected === 0) throw notFound("Pregunta no encontrada");
    });

    const updated = await this.repo.findQuestionById(quizId, questionId);
    if (!updated) throw notFound("Pregunta no encontrada");
    return updated;
  }

  async deleteQuestion(requester: AuthContext, courseId: number, quizId: number, questionId: number): Promise<void> {
    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    this.assertCanManage(requester, course.docente_id);
    await withTransaction(async (conn) => {
      const affected = await this.repo.softDeleteQuestion(conn, quizId, questionId);
      if (affected === 0) throw notFound("Pregunta no encontrada");
    });
  }

  async startQuiz(
    requester: AuthContext,
    courseId: number,
    quizId: number
  ): Promise<{ intento_id: number; quiz: Quiz; preguntas: QuizQuestionPublic[]; numero_intento: number; variante: QuizVariant | null }> {
    if (requester.role !== "estudiante") throw forbidden("No autorizado");
    await this.repo.ensureVariantSchema();

    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    if (course.estado !== "publicado") throw notFound("Curso no encontrado");

    const quiz = await this.repo.findQuizById(courseId, quizId);
    if (!quiz) throw notFound("Quiz no encontrado");
    if (quiz.estado === "cerrado") throw forbidden("El quiz está cerrado");
    if (quiz.estado !== "publicado") throw notFound("Quiz no encontrado");
    const window = nowIsWithinWindow(quiz);
    if (!window.ok) throw forbidden(window.message ?? "No disponible");

    if (quiz.tipo === "admision") {
      const requiresPayment = Number(quiz.precio_admision) > 0;
      const latestPaidAt = requiresPayment ? await this.repo.latestPaidAdmissionAt(requester.userId, courseId) : null;
      if (requiresPayment && !latestPaidAt) {
        throw forbidden("Debes pagar el examen de admisión antes de iniciarlo");
      }
      const bestScore = await this.repo.bestCompletedAttemptScoreForQuiz(quizId, requester.userId);
      if (
        bestScore !== null &&
        admissionPassed(bestScore, Number(quiz.puntaje_total), Number(quiz.porcentaje_aprobacion))
      ) {
        throw forbidden("Ya aprobaste el examen de admisión");
      }
    } else {
      const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
      if (!enrolled) throw forbidden("No tienes acceso a este curso");
    }

    const variante = (await this.repo.quizHasVariants(quizId)) ? randomVariant() : null;
    const preguntas = await this.repo.listActiveQuestionsPublic(quizId, variante);
    if (preguntas.length === 0) throw badRequest("Este quiz no tiene preguntas activas");

    const { intentoId, numeroIntento } = await withTransaction(async (conn) => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const latestPaidAt =
          quiz.tipo === "admision" && Number(quiz.precio_admision) > 0
            ? await this.repo.latestPaidAdmissionAt(requester.userId, courseId)
            : null;
        const used =
          quiz.tipo === "admision"
            ? await this.repo.countAttemptsSince(conn, quizId, requester.userId, latestPaidAt)
            : await this.repo.countAttempts(conn, quizId, requester.userId);
        if (used >= quiz.intentos_permitidos) {
          if (quiz.tipo === "admision") {
            const bestScore = await this.repo.bestCompletedAttemptScore(conn, quizId, requester.userId);
            if (
              bestScore !== null &&
              admissionPassed(bestScore, Number(quiz.puntaje_total), Number(quiz.porcentaje_aprobacion))
            ) {
              throw forbidden("Ya aprobaste el examen de admisión");
            }
            if (quiz.requiere_pago_reintento === 1) {
              throw forbidden(
                "No aprobaste el examen de admisión dentro de las oportunidades disponibles. Debes realizar un nuevo pago para habilitar más intentos."
              );
            }
          }
          throw forbidden("Ya alcanzaste el límite de intentos");
        }

        const numero = await this.repo.nextAttemptNumber(conn, quizId, requester.userId);
        try {
          const id = await this.repo.createAttempt(conn, quizId, requester.userId, numero, variante);
          return { intentoId: id, numeroIntento: numero };
        } catch (err) {
          if (isDuplicateEntry(err) && attempt < 2) continue;
          throw err;
        }
      }

      throw forbidden("No se pudo iniciar el intento. Intenta de nuevo.");
    });

    return { intento_id: intentoId, quiz, preguntas: preguntas as QuizQuestionPublic[], numero_intento: numeroIntento, variante };
  }

  async submitQuiz(
    requester: AuthContext,
    courseId: number,
    quizId: number,
    attemptId: number,
    input: SubmitQuizInput
  ): Promise<AttemptResult> {
    if (requester.role !== "estudiante") throw forbidden("No autorizado");
    await this.repo.ensureVariantSchema();

    const course = await this.repo.findCourse(courseId);
    if (!course) throw notFound("Curso no encontrado");
    if (course.estado !== "publicado") throw notFound("Curso no encontrado");

    const quiz = await this.repo.findQuizById(courseId, quizId);
    if (!quiz) throw notFound("Quiz no encontrado");
    if (quiz.estado === "cerrado") throw forbidden("El quiz está cerrado");
    if (quiz.estado !== "publicado") throw notFound("Quiz no encontrado");
    if (quiz.tipo !== "admision") {
      const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
      if (!enrolled) throw forbidden("No tienes acceso a este curso");
    }
    const window = nowIsWithinWindow(quiz);
    if (!window.ok) throw forbidden(window.message ?? "No disponible");

    const result = await withTransaction(async (conn) => {
      const intento = await this.repo.findAttemptById(conn, attemptId);
      if (!intento) throw notFound("Intento no encontrado");
      if (intento.quiz_id !== quizId) throw badRequest("Intento inválido");
      if (intento.estudiante_id !== requester.userId) throw forbidden("No autorizado");
      if (intento.completado === 1) throw forbidden("Este intento ya fue enviado");

      const checks = await this.repo.listAnswerChecks(conn, quizId, intento.variante ?? null);
      const answersByQuestion = new Map<number, string | null>();
      input.respuestas.forEach((r) => {
        answersByQuestion.set(r.pregunta_id, r.respuesta_usuario ?? null);
      });

      let score = 0;
      const detalle: AttemptResult["detalle"] = [];
      const answerRows: Array<{
        attemptId: number;
        questionId: number;
        respuestaUsuario: string | null;
        esCorrecta: 0 | 1;
        puntosObtenidos: number;
      }> = [];

      for (const c of checks) {
        const user = answersByQuestion.get(c.pregunta_id) ?? null;
        const answerKey = resolvedCorrectAnswer(c, intento.variante);
        const correct = normalizeAnswer(user) === normalizeAnswer(answerKey);
        const puntosPregunta = Number(c.puntos);
        const puntosObtenidos = correct ? puntosPregunta : 0;
        score += puntosObtenidos;
        answerRows.push({
          attemptId,
          questionId: c.pregunta_id,
          respuestaUsuario: user,
          esCorrecta: correct ? 1 : 0,
          puntosObtenidos,
        });

        detalle.push({
          pregunta_id: c.pregunta_id,
          respuesta_usuario: user,
          es_correcta: correct,
          puntos_obtenidos: puntosObtenidos,
          respuesta_correcta: quiz.mostrar_resultado_inmediato ? answerKey : undefined,
          explicacion: quiz.mostrar_resultado_inmediato ? c.explicacion : undefined,
        });
      }

      await this.repo.upsertAttemptAnswers(conn, answerRows);
      await this.repo.completeAttempt(conn, attemptId, score);
      const updatedAttempt = await this.repo.findAttemptById(conn, attemptId);
      if (!updatedAttempt) throw new Error("No se pudo completar el intento");

      return { updatedAttempt, score, detalle };
    });

    const porcentajeObtenido = admissionPercent(result.score, Number(quiz.puntaje_total));
    const isAdmission = quiz.tipo === "admision";

    return {
      intento: result.updatedAttempt,
      mostrar_resultado: quiz.mostrar_resultado_inmediato === 1,
      puntaje_obtenido: result.score,
      puntaje_total: Number(quiz.puntaje_total),
      porcentaje_obtenido: porcentajeObtenido,
      porcentaje_aprobacion: isAdmission ? Number(quiz.porcentaje_aprobacion) : null,
      aprobado: isAdmission ? admissionPassed(result.score, Number(quiz.puntaje_total), Number(quiz.porcentaje_aprobacion)) : null,
      detalle: quiz.mostrar_resultado_inmediato === 1 ? result.detalle : undefined,
    };
  }

  private validateQuestion(input: CreateQuestionInput) {
    const validateVariantAnswers = (validateAnswer: (answer: string, label: string) => void) => {
      if (!hasAnyVariantAnswer(input)) return;

      const variants: Array<[QuizVariant, string | null | undefined]> = [
        ["A", input.respuesta_correcta_a],
        ["B", input.respuesta_correcta_b],
        ["C", input.respuesta_correcta_c],
        ["D", input.respuesta_correcta_d],
      ];

      for (const [variant, answer] of variants) {
        if (!answer?.trim()) {
          throw badRequest("Para usar variantes, completa la respuesta correcta de A, B, C y D.");
        }
        validateAnswer(answer, `respuesta_correcta_${variant.toLowerCase()}`);
      }
    };

    if (input.tipo === "verdadero_falso") {
      const validate = (answer: string, label: string) => {
        const v = normalizeAnswer(answer);
        if (v !== "verdadero" && v !== "falso") {
          throw badRequest(`Para verdadero/falso, ${label} debe ser 'verdadero' o 'falso'`);
        }
      };
      validate(input.respuesta_correcta, "respuesta_correcta");
      validateVariantAnswers(validate);
    }
    if (input.tipo === "opcion_unica") {
      const opts = [input.opcion_a, input.opcion_b, input.opcion_c, input.opcion_d].filter((x) => (x ?? "").trim().length > 0);
      if (opts.length < 2) throw badRequest("La pregunta de opción única requiere al menos 2 opciones");
      const normalized = new Set(opts.map((o) => normalizeAnswer(o)));
      const validate = (answer: string, label: string) => {
        const rc = normalizeAnswer(answer);
        if (!normalized.has(rc) && !["a", "b", "c", "d"].includes(rc)) {
          throw badRequest(`${label} debe coincidir con una opción`);
        }
      };
      validate(input.respuesta_correcta, "respuesta_correcta");
      validateVariantAnswers(validate);
    }
    if (input.tipo === "respuesta_corta") {
      if (input.respuesta_correcta.trim().length === 0) throw badRequest("respuesta_correcta es requerida");
      validateVariantAnswers((answer, label) => {
        if (answer.trim().length === 0) throw badRequest(`${label} es requerida`);
      });
    }
  }

  private async getAdmissionVariantTotals(
    quizId: number,
    excludeQuestionId?: number
  ): Promise<Record<QuizVariant, number>> {
    const questions = await this.repo.listQuestions(quizId);
    const filtered = excludeQuestionId ? questions.filter((question) => question.id !== excludeQuestionId) : questions;
    const totals: Record<QuizVariant, number> = { A: 0, B: 0, C: 0, D: 0 };

    for (const question of filtered) {
      const points = Number(question.puntos ?? 0);
      if (!Number.isFinite(points) || points <= 0 || question.estado !== "activo") continue;
      for (const variant of admissionVariantPaths()) {
        if (questionMatchesVariantPath(question, variant)) {
          totals[variant] = roundPoints(totals[variant] + points);
        }
      }
    }

    return totals;
  }

  private async assertQuizTotalFitsAllVariants(quiz: Quiz, quizId: number, configuredTotal: number): Promise<void> {
    if (quiz.tipo !== "admision") return;
    const totals = await this.getAdmissionVariantTotals(quizId);
    const highest = Math.max(...Object.values(totals));
    if (highest - configuredTotal > POINT_EPSILON) {
      const exceeded = admissionVariantPaths().find((variant) => totals[variant] === highest) ?? "A";
      throw badRequest(
        `La variante ${exceeded} suma ${formatPoints(highest)} pts y supera el puntaje total configurado (${formatPoints(
          configuredTotal
        )} pts).`
      );
    }
  }

  private async assertQuestionFitsBudget(
    quiz: Quiz,
    quizId: number,
    status: QuestionStatus,
    points: number,
    excludeQuestionId?: number,
    targetVariant?: QuizVariant | null
  ): Promise<void> {
    if (status !== "activo") return;

    const configuredTotal = Number(quiz.puntaje_total);
    const nextPoints = Number(points ?? 0);

    if (!Number.isFinite(configuredTotal) || configuredTotal <= 0) {
      throw badRequest("Configura primero un puntaje total válido en el quiz.");
    }

    if (quiz.tipo === "admision") {
      const totals = await this.getAdmissionVariantTotals(quizId, excludeQuestionId);
      const affectedVariants = targetVariant ? [targetVariant] : admissionVariantPaths();

      for (const variant of affectedVariants) {
        const projectedTotal = totals[variant] + nextPoints;
        if (exceedsPointBudget(projectedTotal, configuredTotal)) {
          const availablePoints = Math.max(configuredTotal - totals[variant], 0);
          throw badRequest(
            `La variante ${variant} excede el puntaje total del examen. Disponible: ${formatPoints(
              availablePoints
            )} pts de ${formatPoints(configuredTotal)}.`
          );
        }
      }
      return;
    }

    const usedPoints = await this.repo.sumActiveQuestionPoints(quizId, excludeQuestionId);
    const projectedTotal = usedPoints + nextPoints;
    if (exceedsPointBudget(projectedTotal, configuredTotal)) {
      const availablePoints = Math.max(configuredTotal - usedPoints, 0);
      throw badRequest(
        `Esta pregunta excede el puntaje total del quiz. Disponible: ${formatPoints(availablePoints)} pts de ${formatPoints(configuredTotal)}.`
      );
    }
  }

  private assertCanManage(requester: AuthContext, docenteId: number): void {
    const isAdmin = requester.role === "admin";
    const isOwnerTeacher = requester.role === "docente" && requester.userId === docenteId;
    if (!isAdmin && !isOwnerTeacher) throw forbidden("No autorizado");
  }
}
