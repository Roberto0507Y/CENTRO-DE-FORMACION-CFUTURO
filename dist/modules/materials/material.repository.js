"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialRepository = void 0;
const db_1 = require("../../config/db");
class MaterialRepository {
    async findCourseOwner(courseId) {
        const [rows] = await db_1.pool.query(`SELECT docente_id, estado AS curso_estado
       FROM cursos
       WHERE id = ?
       LIMIT 1`, [courseId]);
        return rows[0] ?? null;
    }
    async isEnrolledActive(courseId, userId) {
        const [rows] = await db_1.pool.query(`SELECT id
       FROM inscripciones
       WHERE curso_id = ? AND usuario_id = ? AND estado = 'activa'
       LIMIT 1`, [courseId, userId]);
        return Boolean(rows[0]);
    }
    async moduleBelongsToCourse(moduleId, courseId) {
        const [rows] = await db_1.pool.query(`SELECT id FROM modulos WHERE id = ? AND curso_id = ? LIMIT 1`, [moduleId, courseId]);
        return Boolean(rows[0]);
    }
    async listByCourse(courseId) {
        const [rows] = await db_1.pool.query(`SELECT
        id, curso_id, modulo_id, titulo, descripcion, tipo, archivo_url, enlace_url,
        orden, estado, created_at, updated_at
       FROM materiales
       WHERE curso_id = ?
       ORDER BY orden ASC, id ASC`, [courseId]);
        return rows;
    }
    async listActiveByCourse(courseId) {
        const [rows] = await db_1.pool.query(`SELECT
        id, curso_id, modulo_id, titulo, descripcion, tipo, archivo_url, enlace_url,
        orden, estado, created_at, updated_at
       FROM materiales
       WHERE curso_id = ? AND estado = 'activo'
       ORDER BY orden ASC, id ASC`, [courseId]);
        return rows;
    }
    async findById(courseId, id) {
        const [rows] = await db_1.pool.query(`SELECT
        id, curso_id, modulo_id, titulo, descripcion, tipo, archivo_url, enlace_url,
        orden, estado, created_at, updated_at
       FROM materiales
       WHERE curso_id = ? AND id = ?
       LIMIT 1`, [courseId, id]);
        return rows[0] ?? null;
    }
    async getNextOrder(courseId, moduloId) {
        if (moduloId === null) {
            const [rows] = await db_1.pool.query(`SELECT COALESCE(MAX(orden), 0) + 1 AS next_order
         FROM materiales
         WHERE curso_id = ? AND modulo_id IS NULL`, [courseId]);
            return rows[0]?.next_order ?? 1;
        }
        const [rows] = await db_1.pool.query(`SELECT COALESCE(MAX(orden), 0) + 1 AS next_order
       FROM materiales
       WHERE curso_id = ? AND modulo_id = ?`, [courseId, moduloId]);
        return rows[0]?.next_order ?? 1;
    }
    async create(courseId, input) {
        const [res] = await db_1.pool.query(`INSERT INTO materiales
        (curso_id, modulo_id, titulo, descripcion, tipo, archivo_url, enlace_url, orden, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            courseId,
            input.modulo_id ?? null,
            input.titulo,
            input.descripcion ?? null,
            input.tipo,
            input.archivo_url ?? null,
            input.enlace_url ?? null,
            input.orden,
            input.estado,
        ]);
        return res.insertId;
    }
    async update(courseId, id, input) {
        const fields = [];
        const params = [];
        const set = (col, v) => {
            fields.push(`${col} = ?`);
            params.push(v);
        };
        if (input.modulo_id !== undefined)
            set("modulo_id", input.modulo_id ?? null);
        if (input.titulo !== undefined)
            set("titulo", input.titulo);
        if (input.descripcion !== undefined)
            set("descripcion", input.descripcion ?? null);
        if (input.tipo !== undefined)
            set("tipo", input.tipo);
        if (input.archivo_url !== undefined)
            set("archivo_url", input.archivo_url ?? null);
        if (input.enlace_url !== undefined)
            set("enlace_url", input.enlace_url ?? null);
        if (input.orden !== undefined)
            set("orden", input.orden);
        if (input.estado !== undefined)
            set("estado", input.estado);
        if (fields.length === 0)
            return;
        params.push(courseId, id);
        await db_1.pool.query(`UPDATE materiales SET ${fields.join(", ")} WHERE curso_id = ? AND id = ?`, params);
    }
    async patchStatus(courseId, id, estado) {
        await db_1.pool.query(`UPDATE materiales SET estado = ? WHERE curso_id = ? AND id = ?`, [estado, courseId, id]);
    }
}
exports.MaterialRepository = MaterialRepository;
