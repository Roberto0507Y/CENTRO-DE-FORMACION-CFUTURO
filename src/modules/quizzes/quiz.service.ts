import { badRequest, forbidden, notFound } from "../../common/errors/httpErrors";
import type { AuthContext } from "../../common/types/express";
import { withTransaction } from "../../config/db";
import { QuizRepository } from "./quiz.repository";
import type {
  AttemptResult,
  CreateQuestionInput,
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

function admissionPercent(score: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.round(((score / total) * 100 + Number.EPSILON) * 100) / 100;
}

function admissionPassed(score: number, quiz: Quiz): boolean {
  return admissionPercent(score, Number(quiz.puntaje_total)) + POINT_EPSILON >= Number(quiz.porcentaje_aprobacion);
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
    return this.repo.listQuizzes(courseId, "publicado");
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
    const passed = bestScore !== null && admissionPassed(bestScore, quiz);
    const attemptsUsed = await withTransaction((conn) =>
      this.repo.countAttemptsSince(conn, quiz.id, requester.userId, latestPaidAt)
    );
    const attemptsRemaining = Math.max(Number(quiz.intentos_permitidos) - attemptsUsed, 0);
    const availability = nowIsWithinWindow(quiz);
    const exhausted = attemptsRemaining <= 0;
    const needsNewPayment = !passed && exhausted && quiz.requiere_pago_reintento === 1;
    const canTakeExam = !passed && hasPaid && !exhausted && availability.ok;

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
            : exhausted
              ? "Ya alcanzaste el límite de oportunidades."
              : null,
    };
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

    if (input.puntaje_total !== undefined) {
      const activePoints = await this.repo.sumActiveQuestionPoints(quizId);
      if (exceedsPointBudget(activePoints, input.puntaje_total)) {
        throw badRequest(
          `El puntaje total no puede ser menor que la suma de preguntas activas (${formatPoints(activePoints)} pts).`
        );
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
    await this.assertQuestionFitsBudget(quiz, quizId, input.estado ?? "activo", input.puntos ?? 1);

    const id = await withTransaction(async (conn) => {
      return this.repo.createQuestion(conn, quizId, {
        quiz_id: quizId,
        enunciado: input.enunciado.trim(),
        tipo: input.tipo,
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
    await this.assertQuestionFitsBudget(quiz, quizId, nextQuestion.estado ?? "activo", nextQuestion.puntos ?? 1, current.id);

    await withTransaction(async (conn) => {
      const affected = await this.repo.updateQuestion(conn, quizId, questionId, {
        ...input,
        enunciado: input.enunciado?.trim(),
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
      if (bestScore !== null && admissionPassed(bestScore, quiz)) {
        throw forbidden("Ya aprobaste el examen de admisión");
      }
    } else {
      const enrolled = await this.repo.userIsEnrolledActive(requester.userId, courseId);
      if (!enrolled) throw forbidden("No tienes acceso a este curso");
    }

    const preguntas = await this.repo.listActiveQuestionsPublic(quizId);
    if (preguntas.length === 0) throw badRequest("Este quiz no tiene preguntas activas");
    const variante = (await this.repo.quizHasVariants(quizId)) ? randomVariant() : null;

    const { intentoId, numeroIntento } = await withTransaction(async (conn) => {
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
          if (bestScore !== null && admissionPassed(bestScore, quiz)) {
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
      const numero = used + 1;
      const id = await this.repo.createAttempt(conn, quizId, requester.userId, numero, variante);
      return { intentoId: id, numeroIntento: numero };
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

      const checks = await this.repo.listAnswerChecks(conn, quizId);
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
      aprobado: isAdmission ? porcentajeObtenido + POINT_EPSILON >= Number(quiz.porcentaje_aprobacion) : null,
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

  private async assertQuestionFitsBudget(
    quiz: Quiz,
    quizId: number,
    status: QuestionStatus,
    points: number,
    excludeQuestionId?: number
  ): Promise<void> {
    if (status !== "activo") return;

    const configuredTotal = Number(quiz.puntaje_total);
    const nextPoints = Number(points ?? 0);
    const usedPoints = await this.repo.sumActiveQuestionPoints(quizId, excludeQuestionId);
    const projectedTotal = usedPoints + nextPoints;

    if (!Number.isFinite(configuredTotal) || configuredTotal <= 0) {
      throw badRequest("Configura primero un puntaje total válido en el quiz.");
    }

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
