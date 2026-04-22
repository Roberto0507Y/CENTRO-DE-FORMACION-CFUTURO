import type { ResultSetHeader, RowDataPacket, PoolConnection } from "mysql2/promise";
import { pool } from "../../config/db";
import type { Attempt, Quiz, QuizQuestion, QuizStatus, QuizVariant } from "./quiz.types";

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

export class QuizRepository {
  private static columnCache = new Map<string, boolean>();
  private static variantsEnsured = false;

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
    const whereStatus = status ? "AND estado = ?" : "";
    const params: Array<string | number> = status ? [courseId, status] : [courseId];
    const [rows] = await pool.query<QuizRow[]>(
      `SELECT
        id, curso_id, modulo_id, titulo, descripcion, instrucciones,
        puntaje_total, tiempo_limite_minutos, intentos_permitidos,
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
    const [rows] = await pool.query<QuizRow[]>(
      `SELECT
        id, curso_id, modulo_id, titulo, descripcion, instrucciones,
        puntaje_total, tiempo_limite_minutos, intentos_permitidos,
        fecha_apertura, fecha_cierre, mostrar_resultado_inmediato,
        estado, created_at, updated_at
       FROM quizzes
       WHERE curso_id = ? AND id = ?
       LIMIT 1`,
      [courseId, quizId]
    );
    return rows[0] ?? null;
  }

  async createQuiz(conn: PoolConnection, courseId: number, input: Omit<Quiz, "id" | "created_at" | "updated_at">): Promise<number> {
    const [res] = await conn.execute<ResultSetHeader>(
      `INSERT INTO quizzes
        (curso_id, modulo_id, titulo, descripcion, instrucciones, puntaje_total,
         tiempo_limite_minutos, intentos_permitidos, fecha_apertura, fecha_cierre,
         mostrar_resultado_inmediato, estado, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        courseId,
        input.modulo_id,
        input.titulo,
        input.descripcion,
        input.instrucciones,
        input.puntaje_total,
        input.tiempo_limite_minutos,
        input.intentos_permitidos,
        input.fecha_apertura,
        input.fecha_cierre,
        input.mostrar_resultado_inmediato,
        input.estado,
      ]
    );
    return res.insertId;
  }

  async updateQuiz(conn: PoolConnection, courseId: number, quizId: number, input: Partial<Omit<Quiz, "id" | "curso_id" | "created_at" | "updated_at">>): Promise<number> {
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
    set("puntaje_total", "puntaje_total");
    set("tiempo_limite_minutos", "tiempo_limite_minutos");
    set("intentos_permitidos", "intentos_permitidos");
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
