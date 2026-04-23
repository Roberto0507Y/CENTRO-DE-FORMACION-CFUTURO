import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../../config/db";
import type { ReportCourse, ReportStudent } from "./report.types";

type CourseRow = RowDataPacket & {
  id: number;
  titulo: string;
  docente_id: number;
  docente_nombres: string;
  docente_apellidos: string;
};
type StudentRow = RowDataPacket & ReportStudent;

type TaskTotalsRow = RowDataPacket & {
  estudiante_id: number;
  total: number;
  calificadas: number;
  puntos_obtenidos: string | number | null;
  puntos_posibles: string | number | null;
};

type QuizTotalsRow = RowDataPacket & {
  estudiante_id: number;
  total: number;
  completados: number;
  intentos: number;
  puntos_obtenidos: string | number | null;
  puntos_posibles: string | number | null;
};

export class ReportRepository {
  async findCourse(courseId: number): Promise<ReportCourse | null> {
    const [rows] = await pool.query<CourseRow[]>(
      `SELECT
         c.id,
         c.titulo,
         c.docente_id,
         u.nombres AS docente_nombres,
         u.apellidos AS docente_apellidos
       FROM cursos c
       JOIN usuarios u ON u.id = c.docente_id
       WHERE c.id = ?
       LIMIT 1`,
      [courseId]
    );

    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      titulo: row.titulo,
      docente_id: row.docente_id,
      docente: {
        nombres: String(row.docente_nombres ?? ""),
        apellidos: String(row.docente_apellidos ?? ""),
      },
    };
  }

  async listActiveStudents(courseId: number): Promise<ReportStudent[]> {
    const [rows] = await pool.query<StudentRow[]>(
      `SELECT
         u.id,
         u.nombres,
         u.apellidos,
         u.correo
       FROM inscripciones i
       JOIN usuarios u ON u.id = i.usuario_id
       WHERE i.curso_id = ?
         AND i.estado = 'activa'
       ORDER BY u.apellidos ASC, u.nombres ASC, u.id ASC`,
      [courseId]
    );
    return rows.map((row) => ({
      id: row.id,
      nombres: row.nombres,
      apellidos: row.apellidos,
      correo: row.correo,
    }));
  }

  async listTaskTotals(courseId: number): Promise<TaskTotalsRow[]> {
    const [rows] = await pool.query<TaskTotalsRow[]>(
      `SELECT
         u.id AS estudiante_id,
         COUNT(DISTINCT t.id) AS total,
         SUM(CASE WHEN e.calificacion IS NULL THEN 0 ELSE 1 END) AS calificadas,
         COALESCE(SUM(COALESCE(e.calificacion, 0)), 0) AS puntos_obtenidos,
         COALESCE(SUM(COALESCE(t.puntos, 0)), 0) AS puntos_posibles
       FROM inscripciones i
       JOIN usuarios u ON u.id = i.usuario_id
       LEFT JOIN tareas t
         ON t.curso_id = i.curso_id
        AND t.estado = 'publicada'
       LEFT JOIN entregas_tareas e
         ON e.tarea_id = t.id
        AND e.estudiante_id = u.id
       WHERE i.curso_id = ?
         AND i.estado = 'activa'
       GROUP BY u.id
       ORDER BY u.apellidos ASC, u.nombres ASC, u.id ASC`,
      [courseId]
    );
    return rows;
  }

  async listQuizTotals(courseId: number): Promise<QuizTotalsRow[]> {
    const [rows] = await pool.query<QuizTotalsRow[]>(
      `SELECT
         u.id AS estudiante_id,
         COUNT(DISTINCT q.id) AS total,
         COALESCE(SUM(CASE WHEN qa.completado = 1 THEN 1 ELSE 0 END), 0) AS completados,
         COALESCE(SUM(COALESCE(qa.intentos, 0)), 0) AS intentos,
         COALESCE(SUM(COALESCE(qa.mejor_puntaje, 0)), 0) AS puntos_obtenidos,
         COALESCE(SUM(COALESCE(q.puntaje_total, 0)), 0) AS puntos_posibles
       FROM inscripciones i
       JOIN usuarios u ON u.id = i.usuario_id
       LEFT JOIN quizzes q
         ON q.curso_id = i.curso_id
        AND q.estado = 'publicado'
        AND COALESCE(q.tipo, 'regular') <> 'admision'
       LEFT JOIN (
         SELECT
           iq.quiz_id,
           iq.estudiante_id,
           COUNT(*) AS intentos,
           MAX(CASE WHEN iq.completado = 1 THEN 1 ELSE 0 END) AS completado,
           MAX(iq.puntaje_obtenido) AS mejor_puntaje
         FROM intentos_quiz iq
         JOIN quizzes q_scope
           ON q_scope.id = iq.quiz_id
          AND q_scope.curso_id = ?
          AND COALESCE(q_scope.tipo, 'regular') <> 'admision'
         GROUP BY iq.quiz_id, iq.estudiante_id
       ) qa
         ON qa.quiz_id = q.id
        AND qa.estudiante_id = u.id
       WHERE i.curso_id = ?
         AND i.estado = 'activa'
       GROUP BY u.id
       ORDER BY u.apellidos ASC, u.nombres ASC, u.id ASC`,
      [courseId, courseId]
    );
    return rows;
  }
}
