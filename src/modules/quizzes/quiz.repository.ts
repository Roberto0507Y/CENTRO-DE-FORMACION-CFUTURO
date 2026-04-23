import type { ResultSetHeader, RowDataPacket, PoolConnection } from "mysql2/promise";
import { pool } from "../../config/db";
import type { AdmissionResultItem, Attempt, Quiz, QuizQuestion, QuizStatus, QuizVariant } from "./quiz.types";

type CourseRow = RowDataPacket & { id: number; docente_id: number; estado: "borrador" | "publicado" | "oculto" };

type QuizRow = RowDataPacket & Quiz;
type QuestionRow = RowDataPacket & QuizQuestion;
type AttemptRow = RowDataPacket & Attempt;
type EnrollmentRow = RowDataPacket & { id: number };
type AggregateRow = RowDataPacket & { total: string | number | null };

type AnswerCheckRow = RowDataPacket & {
  pregunta_id: number;
  tipo: QuizQuestion["tipo"];
  opcion_a: string | null;
  opcion_b: string | null;
  opcion_c: string | null;
  opcion_d: string | null;
  respuesta_correcta: string;
  respuesta_correcta_a: string | null;
  respuesta_correcta_b: string | null;
  respuesta_correcta_c: string | null;
  respuesta_correcta_d: string | null;
  explicacion: string | null;
  puntos: string;
};

type ColumnExistsRow = RowDataPacket & { cnt: number };
type VariantCountRow = RowDataPacket & { total: number };
type PaidAtRow = RowDataPacket & { paid_at: string | null };
type AttemptCountRow = RowDataPacket & { total: number };
type AttemptNumberRow = RowDataPacket & { numero_intento: number };
type AdmissionResultRow = RowDataPacket & {
  usuario_id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  pago_estado: AdmissionResultItem["pago_estado"] | null;
  intentos: number | null;
  completados: number | null;
  mejor_puntaje: string | number | null;
  puntaje_total: string | number;
  porcentaje_aprobacion: string | number;
  fecha_ultimo_intento: string | null;
  fecha_ultimo_pago: string | null;
};

export class QuizRepository {
  private static columnCache = new Map<string, boolean>();
  private static variantsEnsured = false;
  private static admissionEnsured = false;

  private static async hasColumn(table: string, column: string): Promise<boolean> {
    const key = `${table}.${column}`;
    const cached = QuizRepository.columnCache.get(key);
    if (cached !== undefined) return cached;

    const [rows] = await pool.query<ColumnExistsRow[]>(
      `SELECT COUNT(*) AS cnt
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      [table, column]
    );

    const exists = Number(rows?.[0]?.cnt ?? 0) > 0;
    QuizRepository.columnCache.set(key, exists);
    return exists;
  }

  private static async addColumnIfMissing(table: string, column: string, ddl: string): Promise<void> {
    if (await QuizRepository.hasColumn(table, column)) return;
    await pool.execute(ddl);
    QuizRepository.columnCache.set(`${table}.${column}`, true);
  }

  private static async ensureVariantColumns(): Promise<void> {
    if (QuizRepository.variantsEnsured) return;

    await QuizRepository.addColumnIfMissing(
      "preguntas_quiz",
      "respuesta_correcta_a",
      "ALTER TABLE preguntas_quiz ADD COLUMN respuesta_correcta_a VARCHAR(255) NULL AFTER respuesta_correcta"
    );
    await QuizRepository.addColumnIfMissing(
      "preguntas_quiz",
      "respuesta_correcta_b",
      "ALTER TABLE preguntas_quiz ADD COLUMN respuesta_correcta_b VARCHAR(255) NULL AFTER respuesta_correcta_a"
    );
    await QuizRepository.addColumnIfMissing(
      "preguntas_quiz",
      "respuesta_correcta_c",
      "ALTER TABLE preguntas_quiz ADD COLUMN respuesta_correcta_c VARCHAR(255) NULL AFTER respuesta_correcta_b"
    );
    await QuizRepository.addColumnIfMissing(
      "preguntas_quiz",
      "respuesta_correcta_d",
      "ALTER TABLE preguntas_quiz ADD COLUMN respuesta_correcta_d VARCHAR(255) NULL AFTER respuesta_correcta_c"
    );
    await QuizRepository.addColumnIfMissing(
      "intentos_quiz",
      "variante",
      "ALTER TABLE intentos_quiz ADD COLUMN variante VARCHAR(1) NULL AFTER numero_intento"
    );

    QuizRepository.variantsEnsured = true;
  }

  private static async ensureAdmissionColumns(): Promise<void> {
    if (QuizRepository.admissionEnsured) return;

    await QuizRepository.addColumnIfMissing(
      "quizzes",
      "tipo",
      "ALTER TABLE quizzes ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'regular' AFTER instrucciones"
    );
    await QuizRepository.addColumnIfMissing(
      "quizzes",
      "porcentaje_aprobacion",
      "ALTER TABLE quizzes ADD COLUMN porcentaje_aprobacion DECIMAL(5,2) NOT NULL DEFAULT 60.00 AFTER puntaje_total"
    );
    await QuizRepository.addColumnIfMissing(
      "quizzes",
      "precio_admision",
      "ALTER TABLE quizzes ADD COLUMN precio_admision DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER porcentaje_aprobacion"
    );
    await QuizRepository.addColumnIfMissing(
      "quizzes",
      "payment_link_admision",
      "ALTER TABLE quizzes ADD COLUMN payment_link_admision VARCHAR(500) NULL AFTER precio_admision"
    );
    await QuizRepository.addColumnIfMissing(
      "quizzes",
      "requiere_pago_reintento",
      "ALTER TABLE quizzes ADD COLUMN requiere_pago_reintento TINYINT(1) NOT NULL DEFAULT 0 AFTER intentos_permitidos"
    );
    await QuizRepository.addColumnIfMissing(
      "detalle_pagos",
      "concepto",
      "ALTER TABLE detalle_pagos ADD COLUMN concepto VARCHAR(20) NOT NULL DEFAULT 'curso' AFTER curso_id"
    );

    QuizRepository.admissionEnsured = true;
  }

  private static async ensureQuizColumns(): Promise<void> {
    await QuizRepository.ensureAdmissionColumns();
  }

  async ensureVariantSchema(): Promise<void> {
    await QuizRepository.ensureVariantColumns();
  }

  async findCourse(courseId: number): Promise<CourseRow | null> {
    const [rows] = await pool.query<CourseRow[]>(
      `SELECT id, docente_id, estado
       FROM cursos
       WHERE id = ?
       LIMIT 1`,
      [courseId]
    );
    return rows[0] ?? null;
  }

  async userIsEnrolledActive(userId: number, courseId: number): Promise<boolean> {
    const [rows] = await pool.query<EnrollmentRow[]>(
      `SELECT id
       FROM inscripciones
       WHERE usuario_id = ? AND curso_id = ? AND estado = 'activa'
       LIMIT 1`,
      [userId, courseId]
    );
    return Boolean(rows[0]);
  }

  async listQuizzes(courseId: number, status?: QuizStatus): Promise<Quiz[]> {
    await QuizRepository.ensureQuizColumns();
    const whereStatus = status ? "AND estado = ?" : "";
    const params: Array<string | number> = status ? [courseId, status] : [courseId];
    const [rows] = await pool.query<QuizRow[]>(
      `SELECT
        id, curso_id, modulo_id, titulo, descripcion, instrucciones,
        tipo, puntaje_total, porcentaje_aprobacion, precio_admision, payment_link_admision,
        tiempo_limite_minutos, intentos_permitidos, requiere_pago_reintento,
        fecha_apertura, fecha_cierre, mostrar_resultado_inmediato,
        estado, created_at, updated_at
       FROM quizzes
       WHERE curso_id = ?
       ${whereStatus}
       ORDER BY created_at DESC, id DESC`,
      params
    );
    return rows;
  }

  async findQuizById(courseId: number, quizId: number): Promise<Quiz | null> {
    await QuizRepository.ensureQuizColumns();
    const [rows] = await pool.query<QuizRow[]>(
      `SELECT
        id, curso_id, modulo_id, titulo, descripcion, instrucciones,
        tipo, puntaje_total, porcentaje_aprobacion, precio_admision, payment_link_admision,
        tiempo_limite_minutos, intentos_permitidos, requiere_pago_reintento,
        fecha_apertura, fecha_cierre, mostrar_resultado_inmediato,
        estado, created_at, updated_at
       FROM quizzes
       WHERE curso_id = ? AND id = ?
       LIMIT 1`,
      [courseId, quizId]
    );
    return rows[0] ?? null;
  }

  async findPublishedAdmissionQuiz(courseId: number): Promise<Quiz | null> {
    await QuizRepository.ensureQuizColumns();
    const [rows] = await pool.query<QuizRow[]>(
      `SELECT
        id, curso_id, modulo_id, titulo, descripcion, instrucciones,
        tipo, puntaje_total, porcentaje_aprobacion, precio_admision, payment_link_admision,
        tiempo_limite_minutos, intentos_permitidos, requiere_pago_reintento,
        fecha_apertura, fecha_cierre, mostrar_resultado_inmediato,
        estado, created_at, updated_at
       FROM quizzes
       WHERE curso_id = ? AND tipo = 'admision' AND estado = 'publicado'
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [courseId]
    );
    return rows[0] ?? null;
  }

  async listAdmissionResults(courseId: number, quizId: number): Promise<AdmissionResultItem[]> {
    await QuizRepository.ensureQuizColumns();
    const [rows] = await pool.query<AdmissionResultRow[]>(
      `SELECT
         u.id AS usuario_id,
         u.nombres,
         u.apellidos,
         u.correo,
         COALESCE(pay.pago_estado, 'sin_pago') AS pago_estado,
         COALESCE(attempts.intentos, 0) AS intentos,
         COALESCE(attempts.completados, 0) AS completados,
         attempts.mejor_puntaje,
         q.puntaje_total,
         q.porcentaje_aprobacion,
         attempts.fecha_ultimo_intento,
         pay.fecha_ultimo_pago
       FROM quizzes q
       JOIN (
         SELECT estudiante_id AS usuario_id
         FROM intentos_quiz
         WHERE quiz_id = ?
         UNION
         SELECT p.usuario_id
         FROM pagos p
         JOIN detalle_pagos dp ON dp.pago_id = p.id
         WHERE dp.curso_id = ?
           AND COALESCE(dp.concepto, 'curso') = 'admision'
       ) candidates ON 1 = 1
       JOIN usuarios u ON u.id = candidates.usuario_id
       LEFT JOIN (
         SELECT
           estudiante_id,
           COUNT(*) AS intentos,
           SUM(CASE WHEN completado = 1 THEN 1 ELSE 0 END) AS completados,
           MAX(CASE WHEN completado = 1 THEN puntaje_obtenido ELSE NULL END) AS mejor_puntaje,
           MAX(COALESCE(fecha_fin, fecha_inicio)) AS fecha_ultimo_intento
         FROM intentos_quiz
         WHERE quiz_id = ?
         GROUP BY estudiante_id
       ) attempts ON attempts.estudiante_id = u.id
       LEFT JOIN (
         SELECT
           p.usuario_id,
           CASE
             WHEN SUM(CASE WHEN p.estado = 'pagado' THEN 1 ELSE 0 END) > 0 THEN 'pagado'
             WHEN SUM(CASE WHEN p.estado = 'pendiente' THEN 1 ELSE 0 END) > 0 THEN 'pendiente'
             WHEN SUM(CASE WHEN p.estado = 'rechazado' THEN 1 ELSE 0 END) > 0 THEN 'rechazado'
             WHEN SUM(CASE WHEN p.estado = 'reembolsado' THEN 1 ELSE 0 END) > 0 THEN 'reembolsado'
             ELSE 'sin_pago'
           END AS pago_estado,
           MAX(COALESCE(p.fecha_pago, p.created_at)) AS fecha_ultimo_pago
         FROM pagos p
         JOIN detalle_pagos dp ON dp.pago_id = p.id
         WHERE dp.curso_id = ?
           AND COALESCE(dp.concepto, 'curso') = 'admision'
         GROUP BY p.usuario_id
       ) pay ON pay.usuario_id = u.id
       WHERE q.id = ?
         AND q.curso_id = ?
         AND q.tipo = 'admision'
       ORDER BY u.apellidos ASC, u.nombres ASC, u.id ASC`,
      [quizId, courseId, quizId, courseId, quizId, courseId]
    );

    return rows.map((row) => {
      const bestScore = row.mejor_puntaje === null || row.mejor_puntaje === undefined ? null : Number(row.mejor_puntaje);
      const total = Number(row.puntaje_total);
      const threshold = Number(row.porcentaje_aprobacion);
      const percentage = bestScore !== null && total > 0 ? Math.round(((bestScore / total) * 100 + Number.EPSILON) * 100) / 100 : null;
      return {
        usuario_id: row.usuario_id,
        nombres: row.nombres,
        apellidos: row.apellidos,
        correo: row.correo,
        pago_estado: row.pago_estado ?? "sin_pago",
        intentos: Number(row.intentos ?? 0),
        completados: Number(row.completados ?? 0),
        mejor_puntaje: bestScore !== null && Number.isFinite(bestScore) ? bestScore : null,
        puntaje_total: Number.isFinite(total) ? total : 0,
        porcentaje: percentage,
        porcentaje_aprobacion: Number.isFinite(threshold) ? threshold : 0,
        aprobado: percentage !== null && percentage + 1e-9 >= threshold,
        fecha_ultimo_intento: row.fecha_ultimo_intento,
        fecha_ultimo_pago: row.fecha_ultimo_pago,
      };
    });
  }

  async createQuiz(conn: PoolConnection, courseId: number, input: Omit<Quiz, "id" | "created_at" | "updated_at">): Promise<number> {
    await QuizRepository.ensureQuizColumns();
    const [res] = await conn.execute<ResultSetHeader>(
      `INSERT INTO quizzes
        (curso_id, modulo_id, titulo, descripcion, instrucciones, tipo, puntaje_total,
         porcentaje_aprobacion, precio_admision, payment_link_admision, tiempo_limite_minutos, intentos_permitidos,
         requiere_pago_reintento, fecha_apertura, fecha_cierre,
         mostrar_resultado_inmediato, estado, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        courseId,
        input.modulo_id,
        input.titulo,
        input.descripcion,
        input.instrucciones,
        input.tipo,
        input.puntaje_total,
        input.porcentaje_aprobacion,
        input.precio_admision,
        input.payment_link_admision,
        input.tiempo_limite_minutos,
        input.intentos_permitidos,
        input.requiere_pago_reintento,
        input.fecha_apertura,
        input.fecha_cierre,
        input.mostrar_resultado_inmediato,
        input.estado,
      ]
    );
    return res.insertId;
  }

  async updateQuiz(conn: PoolConnection, courseId: number, quizId: number, input: Partial<Omit<Quiz, "id" | "curso_id" | "created_at" | "updated_at">>): Promise<number> {
    await QuizRepository.ensureQuizColumns();
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    const set = (key: keyof typeof input, col: string) => {
      const v = input[key];
      if (v === undefined) return;
      fields.push(`${col} = ?`);
      values.push(v as unknown as string | number | null);
    };

    set("modulo_id", "modulo_id");
    set("titulo", "titulo");
    set("descripcion", "descripcion");
    set("instrucciones", "instrucciones");
    set("tipo", "tipo");
    set("puntaje_total", "puntaje_total");
    set("porcentaje_aprobacion", "porcentaje_aprobacion");
    set("precio_admision", "precio_admision");
    set("payment_link_admision", "payment_link_admision");
    set("tiempo_limite_minutos", "tiempo_limite_minutos");
    set("intentos_permitidos", "intentos_permitidos");
    set("requiere_pago_reintento", "requiere_pago_reintento");
    set("fecha_apertura", "fecha_apertura");
    set("fecha_cierre", "fecha_cierre");
    set("mostrar_resultado_inmediato", "mostrar_resultado_inmediato");

    if (fields.length === 0) return 0;
    values.push(courseId, quizId);

    const [res] = await conn.execute<ResultSetHeader>(
      `UPDATE quizzes
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE curso_id = ? AND id = ?
       LIMIT 1`,
      values
    );
    return res.affectedRows;
  }

  async updateQuizStatus(conn: PoolConnection, courseId: number, quizId: number, estado: QuizStatus): Promise<number> {
    const [res] = await conn.execute<ResultSetHeader>(
      `UPDATE quizzes
       SET estado = ?, updated_at = NOW()
       WHERE curso_id = ? AND id = ?
       LIMIT 1`,
      [estado, courseId, quizId]
    );
    return res.affectedRows;
  }

  async listQuestions(quizId: number): Promise<QuizQuestion[]> {
    await QuizRepository.ensureVariantColumns();
    const [rows] = await pool.query<QuestionRow[]>(
      `SELECT
        id, quiz_id, enunciado, tipo, opcion_a, opcion_b, opcion_c, opcion_d,
        respuesta_correcta, respuesta_correcta_a, respuesta_correcta_b,
        respuesta_correcta_c, respuesta_correcta_d,
        explicacion, puntos, orden, estado, created_at, updated_at
       FROM preguntas_quiz
       WHERE quiz_id = ?
       ORDER BY orden ASC, id ASC`,
      [quizId]
    );
    return rows;
  }

  async sumActiveQuestionPoints(quizId: number, excludeQuestionId?: number): Promise<number> {
    const excludeSql = excludeQuestionId ? "AND id <> ?" : "";
    const params: Array<number> = excludeQuestionId ? [quizId, excludeQuestionId] : [quizId];
    const [rows] = await pool.query<AggregateRow[]>(
      `SELECT COALESCE(SUM(puntos), 0) AS total
       FROM preguntas_quiz
       WHERE quiz_id = ? AND estado = 'activo'
       ${excludeSql}`,
      params
    );
    return Number(rows[0]?.total ?? 0);
  }

  async findQuestionById(quizId: number, questionId: number): Promise<QuizQuestion | null> {
    await QuizRepository.ensureVariantColumns();
    const [rows] = await pool.query<QuestionRow[]>(
      `SELECT
        id, quiz_id, enunciado, tipo, opcion_a, opcion_b, opcion_c, opcion_d,
        respuesta_correcta, respuesta_correcta_a, respuesta_correcta_b,
        respuesta_correcta_c, respuesta_correcta_d,
        explicacion, puntos, orden, estado, created_at, updated_at
       FROM preguntas_quiz
       WHERE quiz_id = ? AND id = ?
       LIMIT 1`,
      [quizId, questionId]
    );
    return rows[0] ?? null;
  }

  async listActiveQuestions(quizId: number): Promise<QuizQuestion[]> {
    await QuizRepository.ensureVariantColumns();
    const [rows] = await pool.query<QuestionRow[]>(
      `SELECT
        id, quiz_id, enunciado, tipo, opcion_a, opcion_b, opcion_c, opcion_d,
        respuesta_correcta, respuesta_correcta_a, respuesta_correcta_b,
        respuesta_correcta_c, respuesta_correcta_d,
        explicacion, puntos, orden, estado, created_at, updated_at
       FROM preguntas_quiz
       WHERE quiz_id = ? AND estado = 'activo'
       ORDER BY orden ASC, id ASC`,
      [quizId]
    );
    return rows;
  }

  async listActiveQuestionsPublic(quizId: number): Promise<Array<Omit<
    QuizQuestion,
    "respuesta_correcta" | "respuesta_correcta_a" | "respuesta_correcta_b" | "respuesta_correcta_c" | "respuesta_correcta_d"
  >>> {
    await QuizRepository.ensureVariantColumns();
    const [rows] = await pool.query<(RowDataPacket & Omit<
      QuizQuestion,
      "respuesta_correcta" | "respuesta_correcta_a" | "respuesta_correcta_b" | "respuesta_correcta_c" | "respuesta_correcta_d"
    >)[]>(
      `SELECT
        id, quiz_id, enunciado, tipo, opcion_a, opcion_b, opcion_c, opcion_d,
        explicacion, puntos, orden, estado, created_at, updated_at
       FROM preguntas_quiz
       WHERE quiz_id = ? AND estado = 'activo'
       ORDER BY orden ASC, id ASC`,
      [quizId]
    );
    return rows;
  }

  async createQuestion(conn: PoolConnection, quizId: number, input: Omit<QuizQuestion, "id" | "quiz_id" | "created_at" | "updated_at">): Promise<number> {
    await QuizRepository.ensureVariantColumns();
    const [res] = await conn.execute<ResultSetHeader>(
      `INSERT INTO preguntas_quiz
        (quiz_id, enunciado, tipo, opcion_a, opcion_b, opcion_c, opcion_d,
         respuesta_correcta, respuesta_correcta_a, respuesta_correcta_b,
         respuesta_correcta_c, respuesta_correcta_d,
         explicacion, puntos, orden, estado, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        quizId,
        input.enunciado,
        input.tipo,
        input.opcion_a,
        input.opcion_b,
        input.opcion_c,
        input.opcion_d,
        input.respuesta_correcta,
        input.respuesta_correcta_a,
        input.respuesta_correcta_b,
        input.respuesta_correcta_c,
        input.respuesta_correcta_d,
        input.explicacion,
        input.puntos,
        input.orden,
        input.estado,
      ]
    );
    return res.insertId;
  }

  async updateQuestion(conn: PoolConnection, quizId: number, questionId: number, input: Partial<Omit<QuizQuestion, "id" | "quiz_id" | "created_at" | "updated_at">>): Promise<number> {
    await QuizRepository.ensureVariantColumns();
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    const set = (key: keyof typeof input, col: string) => {
      const v = input[key];
      if (v === undefined) return;
      fields.push(`${col} = ?`);
      values.push(v as unknown as string | number | null);
    };

    set("enunciado", "enunciado");
    set("tipo", "tipo");
    set("opcion_a", "opcion_a");
    set("opcion_b", "opcion_b");
    set("opcion_c", "opcion_c");
    set("opcion_d", "opcion_d");
    set("respuesta_correcta", "respuesta_correcta");
    set("respuesta_correcta_a", "respuesta_correcta_a");
    set("respuesta_correcta_b", "respuesta_correcta_b");
    set("respuesta_correcta_c", "respuesta_correcta_c");
    set("respuesta_correcta_d", "respuesta_correcta_d");
    set("explicacion", "explicacion");
    set("puntos", "puntos");
    set("orden", "orden");
    set("estado", "estado");

    if (fields.length === 0) return 0;
    values.push(quizId, questionId);

    const [res] = await conn.execute<ResultSetHeader>(
      `UPDATE preguntas_quiz
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE quiz_id = ? AND id = ?
       LIMIT 1`,
      values
    );
    return res.affectedRows;
  }

  async softDeleteQuestion(conn: PoolConnection, quizId: number, questionId: number): Promise<number> {
    const [res] = await conn.execute<ResultSetHeader>(
      `UPDATE preguntas_quiz
       SET estado = 'inactivo', updated_at = NOW()
       WHERE quiz_id = ? AND id = ?
       LIMIT 1`,
      [quizId, questionId]
    );
    return res.affectedRows;
  }

  async countAttempts(conn: PoolConnection, quizId: number, studentId: number): Promise<number> {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total
       FROM intentos_quiz
       WHERE quiz_id = ? AND estudiante_id = ?`,
      [quizId, studentId]
    );
    return Number((rows[0] as { total?: unknown } | undefined)?.total ?? 0);
  }

  async bestCompletedAttemptScore(
    conn: PoolConnection,
    quizId: number,
    studentId: number
  ): Promise<number | null> {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT MAX(puntaje_obtenido) AS best_score
       FROM intentos_quiz
       WHERE quiz_id = ? AND estudiante_id = ? AND completado = 1`,
      [quizId, studentId]
    );
    const value = (rows[0] as { best_score?: string | number | null } | undefined)?.best_score;
    if (value === null || value === undefined) return null;
    const score = Number(value);
    return Number.isFinite(score) ? score : null;
  }

  async bestCompletedAttemptScoreForQuiz(
    quizId: number,
    studentId: number
  ): Promise<number | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT MAX(puntaje_obtenido) AS best_score
       FROM intentos_quiz
       WHERE quiz_id = ? AND estudiante_id = ? AND completado = 1`,
      [quizId, studentId]
    );
    const value = (rows[0] as { best_score?: string | number | null } | undefined)?.best_score;
    if (value === null || value === undefined) return null;
    const score = Number(value);
    return Number.isFinite(score) ? score : null;
  }

  async latestPaidAdmissionAt(userId: number, courseId: number): Promise<string | null> {
    const [rows] = await pool.query<PaidAtRow[]>(
      `SELECT COALESCE(p.fecha_pago, p.created_at) AS paid_at
       FROM pagos p
       JOIN detalle_pagos dp ON dp.pago_id = p.id
       WHERE p.usuario_id = ?
         AND p.estado = 'pagado'
         AND dp.curso_id = ?
         AND COALESCE(dp.concepto, 'curso') = 'admision'
       ORDER BY COALESCE(p.fecha_pago, p.created_at) DESC, p.id DESC
       LIMIT 1`,
      [userId, courseId]
    );
    return rows[0]?.paid_at ?? null;
  }

  async countAttemptsSince(
    conn: PoolConnection,
    quizId: number,
    studentId: number,
    since: string | null
  ): Promise<number> {
    const sinceSql = since ? "AND created_at >= ?" : "";
    const params: Array<number | string> = since ? [quizId, studentId, since] : [quizId, studentId];
    const [rows] = await conn.query<AttemptCountRow[]>(
      `SELECT COUNT(*) AS total
       FROM intentos_quiz
       WHERE quiz_id = ? AND estudiante_id = ?
       ${sinceSql}`,
      params
    );
    return Number(rows[0]?.total ?? 0);
  }

  async nextAttemptNumber(conn: PoolConnection, quizId: number, studentId: number): Promise<number> {
    const [rows] = await conn.query<AttemptNumberRow[]>(
      `SELECT numero_intento
       FROM intentos_quiz
       WHERE quiz_id = ? AND estudiante_id = ?
       ORDER BY numero_intento DESC
       LIMIT 1
       FOR UPDATE`,
      [quizId, studentId]
    );
    const next = Number(rows[0]?.numero_intento ?? 0) + 1;
    return Number.isFinite(next) && next > 0 ? next : 1;
  }

  async createAttempt(
    conn: PoolConnection,
    quizId: number,
    studentId: number,
    numeroIntento: number,
    variante: QuizVariant | null
  ): Promise<number> {
    await QuizRepository.ensureVariantColumns();
    const [res] = await conn.execute<ResultSetHeader>(
      `INSERT INTO intentos_quiz
        (quiz_id, estudiante_id, numero_intento, variante, puntaje_obtenido, completado, fecha_inicio, fecha_fin, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, NULL, 0, NOW(), NULL, NOW(), NOW())`,
      [quizId, studentId, numeroIntento, variante]
    );
    return res.insertId;
  }

  async findAttemptById(conn: PoolConnection, attemptId: number): Promise<Attempt | null> {
    await QuizRepository.ensureVariantColumns();
    const [rows] = await conn.query<AttemptRow[]>(
      `SELECT
        id, quiz_id, estudiante_id, numero_intento, variante, puntaje_obtenido, completado,
        fecha_inicio, fecha_fin, created_at, updated_at
       FROM intentos_quiz
       WHERE id = ?
       LIMIT 1`,
      [attemptId]
    );
    return rows[0] ?? null;
  }

  async listAnswerChecks(conn: PoolConnection, quizId: number): Promise<AnswerCheckRow[]> {
    await QuizRepository.ensureVariantColumns();
    const [rows] = await conn.query<AnswerCheckRow[]>(
      `SELECT
         id AS pregunta_id, tipo, opcion_a, opcion_b, opcion_c, opcion_d,
         respuesta_correcta, respuesta_correcta_a, respuesta_correcta_b,
         respuesta_correcta_c, respuesta_correcta_d,
         explicacion, puntos
       FROM preguntas_quiz
       WHERE quiz_id = ? AND estado = 'activo'`,
      [quizId]
    );
    return rows;
  }

  async quizHasVariants(quizId: number): Promise<boolean> {
    await QuizRepository.ensureVariantColumns();
    const [rows] = await pool.query<VariantCountRow[]>(
      `SELECT COUNT(*) AS total
       FROM preguntas_quiz
       WHERE quiz_id = ?
         AND estado = 'activo'
         AND COALESCE(TRIM(respuesta_correcta_a), '') <> ''
         AND COALESCE(TRIM(respuesta_correcta_b), '') <> ''
         AND COALESCE(TRIM(respuesta_correcta_c), '') <> ''
         AND COALESCE(TRIM(respuesta_correcta_d), '') <> ''`,
      [quizId]
    );
    return Number(rows[0]?.total ?? 0) > 0;
  }

  async upsertAttemptAnswer(
    conn: PoolConnection,
    attemptId: number,
    questionId: number,
    respuestaUsuario: string | null,
    esCorrecta: 0 | 1,
    puntosObtenidos: number
  ): Promise<void> {
    await conn.execute<ResultSetHeader>(
      `INSERT INTO respuestas_intento_quiz
        (intento_id, pregunta_id, respuesta_usuario, es_correcta, puntos_obtenidos, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         respuesta_usuario = VALUES(respuesta_usuario),
         es_correcta = VALUES(es_correcta),
         puntos_obtenidos = VALUES(puntos_obtenidos),
         updated_at = NOW()`,
      [attemptId, questionId, respuestaUsuario, esCorrecta, puntosObtenidos]
    );
  }

  async upsertAttemptAnswers(
    conn: PoolConnection,
    rows: Array<{
      attemptId: number;
      questionId: number;
      respuestaUsuario: string | null;
      esCorrecta: 0 | 1;
      puntosObtenidos: number;
    }>
  ): Promise<void> {
    if (rows.length === 0) return;

    const values: Array<string | number | null> = [];
    const tuples = rows.map((row) => {
      values.push(
        row.attemptId,
        row.questionId,
        row.respuestaUsuario,
        row.esCorrecta,
        row.puntosObtenidos
      );
      return "(?, ?, ?, ?, ?, NOW(), NOW())";
    });

    await conn.execute<ResultSetHeader>(
      `INSERT INTO respuestas_intento_quiz
        (intento_id, pregunta_id, respuesta_usuario, es_correcta, puntos_obtenidos, created_at, updated_at)
       VALUES
        ${tuples.join(", ")}
       ON DUPLICATE KEY UPDATE
         respuesta_usuario = VALUES(respuesta_usuario),
         es_correcta = VALUES(es_correcta),
         puntos_obtenidos = VALUES(puntos_obtenidos),
         updated_at = NOW()`,
      values
    );
  }

  async completeAttempt(conn: PoolConnection, attemptId: number, score: number): Promise<number> {
    const [res] = await conn.execute<ResultSetHeader>(
      `UPDATE intentos_quiz
       SET puntaje_obtenido = ?, completado = 1, fecha_fin = NOW(), updated_at = NOW()
       WHERE id = ?
       LIMIT 1`,
      [score, attemptId]
    );
    return res.affectedRows;
  }
}
