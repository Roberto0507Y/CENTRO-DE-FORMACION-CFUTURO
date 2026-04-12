"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourseModuleRepository = void 0;
const db_1 = require("../../config/db");
class CourseModuleRepository {
    async findCourseById(courseId) {
        const [rows] = await db_1.pool.query(`SELECT id, docente_id, estado
       FROM cursos
       WHERE id = ?
       LIMIT 1`, [courseId]);
        return rows[0] ?? null;
    }
    async listByCourse(courseId, opts) {
        const [rows] = await db_1.pool.query(`SELECT id, curso_id, titulo, descripcion, orden, estado
       FROM modulos
       WHERE curso_id = ?
         AND (? = 0 OR estado = 'activo')
       ORDER BY orden ASC, id ASC`, [courseId, opts.onlyActive ? 1 : 0]);
        return rows;
    }
}
exports.CourseModuleRepository = CourseModuleRepository;
