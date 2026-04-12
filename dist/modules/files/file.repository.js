"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileRepository = void 0;
const db_1 = require("../../config/db");
class FileRepository {
    async findById(id) {
        const [rows] = await db_1.pool.query(`SELECT
        id, s3_key, nombre_original, mime_type, size_bytes, owner_usuario_id,
        curso_id, access_scope, created_at, updated_at
       FROM archivos
       WHERE id = ?
       LIMIT 1`, [id]);
        return rows[0] ?? null;
    }
    async create(input) {
        const [res] = await db_1.pool.execute(`INSERT INTO archivos
        (s3_key, nombre_original, mime_type, size_bytes, owner_usuario_id, curso_id, access_scope)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            input.s3_key,
            input.nombre_original,
            input.mime_type,
            input.size_bytes ?? null,
            input.owner_usuario_id ?? null,
            input.curso_id ?? null,
            input.access_scope ?? "owner",
        ]);
        return res.insertId;
    }
    async deleteById(id) {
        await db_1.pool.execute(`DELETE FROM archivos WHERE id = ? LIMIT 1`, [id]);
    }
    async getCourseAccessContext(courseId, userId) {
        const [rows] = await db_1.pool.query(`SELECT
        c.docente_id,
        c.estado AS curso_estado,
        i.id AS inscripcion_id
       FROM cursos c
       LEFT JOIN inscripciones i
         ON i.curso_id = c.id
        AND i.usuario_id = ?
        AND i.estado = 'activa'
       WHERE c.id = ?
       LIMIT 1`, [userId, courseId]);
        const row = rows[0];
        if (!row)
            return null;
        return {
            docente_id: row.docente_id,
            curso_estado: row.curso_estado,
            enrolled: Boolean(row.inscripcion_id),
        };
    }
}
exports.FileRepository = FileRepository;
