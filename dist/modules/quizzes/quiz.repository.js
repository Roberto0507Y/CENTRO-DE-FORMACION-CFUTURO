"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizRepository = void 0;
const db_1 = require("../../config/db");
class QuizRepository {
    async findCourse(courseId) {
        const [rows] = await db_1.pool.query(`SELECT id, docente_id, estado
       FROM cursos
       WHERE id = ?
       LIMIT 1`, [courseId]);
        return rows[0] ?? null;
    }
    async userIsEnrolledActive(userId, courseId) {
        const [rows] = await db_1.pool.query(`SELECT id
       FROM inscripciones
       WHERE usuario_id = ? AND curso_id = ? AND estado = 'activa'
       LIMIT 1`, [userId, courseId]);
        return Boolean(rows[0]);
    }
    async listQuizzes(courseId, status) {
        const whereStatus = status ? "AND estado = ?" : "";
        const params = status ? [courseId, status] : [courseId];
        const [rows] = await db_1.pool.query(`SELECT
        id, curso_id, modulo_id, titulo, descripcion, instrucciones,
        puntaje_total, tiempo_limite_minutos, intentos_permitidos,
        fecha_apertura, fecha_cierre, mostrar_resultado_inmediato,
        estado, created_at, updated_at
       FROM quizzes
       WHERE curso_id = ?
       ${whereStatus}
       ORDER BY created_at DESC, id DESC`, params);
        return rows;
    }
    async findQuizById(courseId, quizId) {
        const [rows] = await db_1.pool.query(`SELECT
        id, curso_id, modulo_id, titulo, descripcion, instrucciones,
        puntaje_total, tiempo_limite_minutos, intentos_permitidos,
        fecha_apertura, fecha_cierre, mostrar_resultado_inmediato,
        estado, created_at, updated_at
       FROM quizzes
       WHERE curso_id = ? AND id = ?
       LIMIT 1`, [courseId, quizId]);
        return rows[0] ?? null;
    }
    async createQuiz(conn, courseId, input) {
        const [res] = await conn.execute(`INSERT INTO quizzes
        (curso_id, modulo_id, titulo, descripcion, instrucciones, puntaje_total,
         tiempo_limite_minutos, intentos_permitidos, fecha_apertura, fecha_cierre,
         mostrar_resultado_inmediato, estado, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, [
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
        ]);
        return res.insertId;
    }
    async updateQuiz(conn, courseId, quizId, input) {
        const fields = [];
        const values = [];
        const set = (key, col) => {
            const v = input[key];
            if (v === undefined)
                return;
            fields.push(`${col} = ?`);
            values.push(v);
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
        if (fields.length === 0)
            return 0;
        values.push(courseId, quizId);
        const [res] = await conn.execute(`UPDATE quizzes
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE curso_id = ? AND id = ?
       LIMIT 1`, values);
        return res.affectedRows;
    }
    async updateQuizStatus(conn, courseId, quizId, estado) {
        const [res] = await conn.execute(`UPDATE quizzes
       SET estado = ?, updated_at = NOW()
       WHERE curso_id = ? AND id = ?
       LIMIT 1`, [estado, courseId, quizId]);
        return res.affectedRows;
    }
    async listQuestions(quizId) {
        const [rows] = await db_1.pool.query(`SELECT
        id, quiz_id, enunciado, tipo, opcion_a, opcion_b, opcion_c, opcion_d,
        respuesta_correcta, explicacion, puntos, orden, estado, created_at, updated_at
       FROM preguntas_quiz
       WHERE quiz_id = ?
       ORDER BY orden ASC, id ASC`, [quizId]);
        return rows;
    }
    async listActiveQuestions(quizId) {
        const [rows] = await db_1.pool.query(`SELECT
        id, quiz_id, enunciado, tipo, opcion_a, opcion_b, opcion_c, opcion_d,
        respuesta_correcta, explicacion, puntos, orden, estado, created_at, updated_at
       FROM preguntas_quiz
       WHERE quiz_id = ? AND estado = 'activo'
       ORDER BY orden ASC, id ASC`, [quizId]);
        return rows;
    }
    async createQuestion(conn, quizId, input) {
        const [res] = await conn.execute(`INSERT INTO preguntas_quiz
        (quiz_id, enunciado, tipo, opcion_a, opcion_b, opcion_c, opcion_d,
         respuesta_correcta, explicacion, puntos, orden, estado, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, [
            quizId,
            input.enunciado,
            input.tipo,
            input.opcion_a,
            input.opcion_b,
            input.opcion_c,
            input.opcion_d,
            input.respuesta_correcta,
            input.explicacion,
            input.puntos,
            input.orden,
            input.estado,
        ]);
        return res.insertId;
    }
    async updateQuestion(conn, quizId, questionId, input) {
        const fields = [];
        const values = [];
        const set = (key, col) => {
            const v = input[key];
            if (v === undefined)
                return;
            fields.push(`${col} = ?`);
            values.push(v);
        };
        set("enunciado", "enunciado");
        set("tipo", "tipo");
        set("opcion_a", "opcion_a");
        set("opcion_b", "opcion_b");
        set("opcion_c", "opcion_c");
        set("opcion_d", "opcion_d");
        set("respuesta_correcta", "respuesta_correcta");
        set("explicacion", "explicacion");
        set("puntos", "puntos");
        set("orden", "orden");
        set("estado", "estado");
        if (fields.length === 0)
            return 0;
        values.push(quizId, questionId);
        const [res] = await conn.execute(`UPDATE preguntas_quiz
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE quiz_id = ? AND id = ?
       LIMIT 1`, values);
        return res.affectedRows;
    }
    async softDeleteQuestion(conn, quizId, questionId) {
        const [res] = await conn.execute(`UPDATE preguntas_quiz
       SET estado = 'inactivo', updated_at = NOW()
       WHERE quiz_id = ? AND id = ?
       LIMIT 1`, [quizId, questionId]);
        return res.affectedRows;
    }
    async countAttempts(conn, quizId, studentId) {
        const [rows] = await conn.query(`SELECT COUNT(*) AS total
       FROM intentos_quiz
       WHERE quiz_id = ? AND estudiante_id = ?`, [quizId, studentId]);
        return Number(rows[0]?.total ?? 0);
    }
    async createAttempt(conn, quizId, studentId, numeroIntento) {
        const [res] = await conn.execute(`INSERT INTO intentos_quiz
        (quiz_id, estudiante_id, numero_intento, puntaje_obtenido, completado, fecha_inicio, fecha_fin, created_at, updated_at)
       VALUES
        (?, ?, ?, NULL, 0, NOW(), NULL, NOW(), NOW())`, [quizId, studentId, numeroIntento]);
        return res.insertId;
    }
    async findAttemptById(conn, attemptId) {
        const [rows] = await conn.query(`SELECT
        id, quiz_id, estudiante_id, numero_intento, puntaje_obtenido, completado,
        fecha_inicio, fecha_fin, created_at, updated_at
       FROM intentos_quiz
       WHERE id = ?
       LIMIT 1`, [attemptId]);
        return rows[0] ?? null;
    }
    async listAnswerChecks(conn, quizId) {
        const [rows] = await conn.query(`SELECT
         id AS pregunta_id, tipo, opcion_a, opcion_b, opcion_c, opcion_d,
         respuesta_correcta, explicacion, puntos
       FROM preguntas_quiz
       WHERE quiz_id = ? AND estado = 'activo'`, [quizId]);
        return rows;
    }
    async upsertAttemptAnswer(conn, attemptId, questionId, respuestaUsuario, esCorrecta, puntosObtenidos) {
        await conn.execute(`INSERT INTO respuestas_intento_quiz
        (intento_id, pregunta_id, respuesta_usuario, es_correcta, puntos_obtenidos, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         respuesta_usuario = VALUES(respuesta_usuario),
         es_correcta = VALUES(es_correcta),
         puntos_obtenidos = VALUES(puntos_obtenidos),
         updated_at = NOW()`, [attemptId, questionId, respuestaUsuario, esCorrecta, puntosObtenidos]);
    }
    async completeAttempt(conn, attemptId, score) {
        const [res] = await conn.execute(`UPDATE intentos_quiz
       SET puntaje_obtenido = ?, completado = 1, fecha_fin = NOW(), updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, [score, attemptId]);
        return res.affectedRows;
    }
}
exports.QuizRepository = QuizRepository;
