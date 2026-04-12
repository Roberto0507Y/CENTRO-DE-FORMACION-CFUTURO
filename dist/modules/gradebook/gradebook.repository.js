"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradebookRepository = void 0;
const db_1 = require("../../config/db");
class GradebookRepository {
    async findStudentCourse(courseId, studentId) {
        const [rows] = await db_1.pool.query(`SELECT
        c.id,
        c.titulo,
        c.estado,
        i.estado AS inscripcion_estado
       FROM cursos c
       JOIN inscripciones i ON i.curso_id = c.id AND i.usuario_id = ?
       WHERE c.id = ?
       LIMIT 1`, [studentId, courseId]);
        return rows[0] ?? null;
    }
    async listTaskGrades(courseId, studentId) {
        const [rows] = await db_1.pool.query(`SELECT
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
       ORDER BY t.fecha_entrega ASC, t.id ASC`, [studentId, courseId]);
        return rows.map((row) => ({
            id: row.id,
            titulo: row.titulo,
            puntos: row.puntos,
            fecha_entrega: row.fecha_entrega,
            estado: row.estado,
            entrega: row.entrega_id && row.entrega_estado && row.entrega_fecha_entrega
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
    async listAttendance(courseId, studentId) {
        const [rows] = await db_1.pool.query(`SELECT
        id,
        DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
        estado,
        comentario
       FROM asistencias
       WHERE curso_id = ?
         AND estudiante_id = ?
       ORDER BY fecha DESC, id DESC`, [courseId, studentId]);
        return rows;
    }
}
exports.GradebookRepository = GradebookRepository;
