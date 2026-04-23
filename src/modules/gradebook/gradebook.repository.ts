import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../../config/db";
import type { GradebookAttendanceItem, GradebookCourse, GradebookQuizItem, GradebookTaskItem } from "./gradebook.types";

type CourseAccessRow = RowDataPacket & GradebookCourse & {
  estado: "borrador" | "publicado" | "oculto";
  inscripcion_estado: "activa" | "pendiente" | "cancelada" | "finalizada";
};

type TaskGradeRow = RowDataPacket & {
  id: number;
  titulo: string;
  puntos: string;
  fecha_entrega: string;
  estado: GradebookTaskItem["estado"];
  entrega_id: number | null;
  entrega_estado: NonNullable<GradebookTaskItem["entrega"]>["estado"] | null;
  calificacion: string | number | null;
  comentario_docente: string | null;
  fecha_calificacion: string | null;
  entrega_fecha_entrega: string | null;
};

type AttendanceRow = RowDataPacket & GradebookAttendanceItem;
type QuizGradeRow = RowDataPacket & {
  id: number;
  titulo: string;
  puntaje_total: string;
  fecha_cierre: string | null;
  estado: GradebookQuizItem["estado"];
  intentos: number | null;
  completado: 0 | 1 | null;
  puntaje_obtenido: string | number | null;
  fecha_fin: string | null;
};

export class GradebookRepository {
  async findStudentCourse(courseId: number, studentId: number): Promise<CourseAccessRow | null> {
    const [rows] = await pool.query<CourseAccessRow[]>(
      `SELECT
        c.id,
        c.titulo,
        c.estado,
        i.estado AS inscripcion_estado
       FROM cursos c
       JOIN inscripciones i ON i.curso_id = c.id AND i.usuario_id = ?
       WHERE c.id = ?
       LIMIT 1`,
      [studentId, courseId]
    );
    return rows[0] ?? null;
  }

  async listTaskGrades(courseId: number, studentId: number): Promise<GradebookTaskItem[]> {
    const [rows] = await pool.query<TaskGradeRow[]>(
      `SELECT
        t.id,
        t.titulo,
        t.puntos,
        t.fecha_entrega,
        t.estado,
        e.id AS entrega_id,
        e.estado AS entrega_estado,
        e.calificacion,
        e.comentario_docente,
        e.fecha_calificacion,
        e.fecha_entrega AS entrega_fecha_entrega
       FROM tareas t
       LEFT JOIN entregas_tareas e
         ON e.tarea_id = t.id
        AND e.estudiante_id = ?
       WHERE t.curso_id = ?
         AND t.estado = 'publicada'
       ORDER BY t.fecha_entrega ASC, t.id ASC`,
      [studentId, courseId]
    );

    return rows.map((row) => ({
      id: row.id,
      titulo: row.titulo,
      puntos: row.puntos,
      fecha_entrega: row.fecha_entrega,
      estado: row.estado,
      entrega:
        row.entrega_id && row.entrega_estado && row.entrega_fecha_entrega
          ? {
              id: row.entrega_id,
              estado: row.entrega_estado,
              calificacion: row.calificacion,
              comentario_docente: row.comentario_docente,
              fecha_calificacion: row.fecha_calificacion,
              fecha_entrega: row.entrega_fecha_entrega,
            }
          : null,
    }));
  }

  async listAttendance(courseId: number, studentId: number): Promise<GradebookAttendanceItem[]> {
    const [rows] = await pool.query<AttendanceRow[]>(
      `SELECT
        id,
        DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
        estado,
        comentario
       FROM asistencias
       WHERE curso_id = ?
         AND estudiante_id = ?
       ORDER BY fecha DESC, id DESC`,
      [courseId, studentId]
    );
    return rows;
  }

  async listQuizGrades(courseId: number, studentId: number): Promise<GradebookQuizItem[]> {
    const [rows] = await pool.query<QuizGradeRow[]>(
      `SELECT
        q.id,
        q.titulo,
        q.puntaje_total,
        q.fecha_cierre,
        q.estado,
        COALESCE(qa.intentos, 0) AS intentos,
        COALESCE(qa.completado, 0) AS completado,
        qa.puntaje_obtenido,
        qa.fecha_fin
       FROM quizzes q
       LEFT JOIN (
         SELECT
           quiz_id,
           estudiante_id,
           COUNT(*) AS intentos,
           MAX(CASE WHEN completado = 1 THEN 1 ELSE 0 END) AS completado,
           MAX(CASE WHEN completado = 1 THEN puntaje_obtenido ELSE NULL END) AS puntaje_obtenido,
           MAX(CASE WHEN completado = 1 THEN fecha_fin ELSE NULL END) AS fecha_fin
         FROM intentos_quiz
         WHERE estudiante_id = ?
         GROUP BY quiz_id, estudiante_id
       ) qa
         ON qa.quiz_id = q.id
       AND qa.estudiante_id = ?
       WHERE q.curso_id = ?
         AND q.estado IN ('publicado', 'cerrado')
         AND COALESCE(q.tipo, 'regular') <> 'admision'
       ORDER BY q.fecha_cierre ASC, q.id ASC`,
      [studentId, studentId, courseId]
    );

    return rows.map((row) => ({
      id: row.id,
      titulo: row.titulo,
      puntaje_total: row.puntaje_total,
      fecha_cierre: row.fecha_cierre,
      estado: row.estado,
      intentos: Number(row.intentos ?? 0),
      completado: row.completado === 1,
      puntaje_obtenido: row.puntaje_obtenido,
      fecha_fin: row.fecha_fin,
    }));
  }
}
