"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonRepository = void 0;
const db_1 = require("../../config/db");
class LessonRepository {
    async getModuleContext(moduleId) {
        const [rows] = await db_1.pool.query(`SELECT
        m.id as modulo_id,
        c.id as curso_id,
        c.estado as curso_estado,
        c.docente_id as docente_id
       FROM modulos m
       JOIN cursos c ON c.id = m.curso_id
       WHERE m.id = ?
       LIMIT 1`, [moduleId]);
        return rows[0] ?? null;
    }
    async userIsEnrolledActive(userId, courseId) {
        const [rows] = await db_1.pool.query(`SELECT 1
       FROM inscripciones
       WHERE usuario_id = ? AND curso_id = ? AND estado = 'activa'
       LIMIT 1`, [userId, courseId]);
        return rows.length > 0;
    }
    async listLessons(moduleId, previewOnly) {
        const [rows] = await db_1.pool.query(`SELECT id, modulo_id, titulo, descripcion, tipo, duracion_minutos, orden, es_preview, estado
       FROM lecciones
       WHERE modulo_id = ?
         AND estado = 'activo'
         AND (? = 0 OR es_preview = 1)
       ORDER BY orden ASC`, [moduleId, previewOnly ? 1 : 0]);
        return rows.map(mapLessonListRow);
    }
    async getLessonAccessContext(lessonId) {
        const [rows] = await db_1.pool.query(`SELECT
        l.id as lessonId,
        l.modulo_id,
        c.id as curso_id,
        c.estado as curso_estado,
        c.docente_id as docente_id,
        l.es_preview,
        l.estado as lesson_estado
       FROM lecciones l
       JOIN modulos m ON m.id = l.modulo_id
       JOIN cursos c ON c.id = m.curso_id
       WHERE l.id = ?
       LIMIT 1`, [lessonId]);
        if (!rows[0])
            return null;
        const r = rows[0];
        return {
            lessonId: r.lessonId,
            modulo_id: r.modulo_id,
            curso_id: r.curso_id,
            curso_estado: r.curso_estado,
            docente_id: r.docente_id,
            es_preview: r.es_preview === 1,
            lesson_estado: r.lesson_estado,
        };
    }
    async findLessonById(lessonId) {
        const [rows] = await db_1.pool.query(`SELECT
        id, modulo_id, titulo, descripcion, tipo, contenido, video_url, archivo_url, enlace_url,
        duracion_minutos, orden, es_preview, estado, created_at, updated_at
       FROM lecciones
       WHERE id = ?
       LIMIT 1`, [lessonId]);
        return rows[0] ? mapLessonDetailRow(rows[0]) : null;
    }
    async getNextOrder(moduleId) {
        const [rows] = await db_1.pool.query(`SELECT COALESCE(MAX(orden), 0) + 1 as nextOrder
       FROM lecciones
       WHERE modulo_id = ?`, [moduleId]);
        return rows[0]?.nextOrder ?? 1;
    }
    async createLesson(input) {
        const [result] = await db_1.pool.execute(`INSERT INTO lecciones
        (modulo_id, titulo, descripcion, tipo, contenido, video_url, archivo_url, enlace_url,
         duracion_minutos, orden, es_preview, estado, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', NOW(), NOW())`, [
            input.modulo_id,
            input.titulo,
            input.descripcion,
            input.tipo,
            input.contenido,
            input.video_url,
            input.archivo_url,
            input.enlace_url,
            input.duracion_minutos,
            input.orden,
            input.es_preview ? 1 : 0,
        ]);
        return result.insertId;
    }
    async updateLessonById(id, input) {
        const fields = [];
        const values = [];
        const set = (column, value) => {
            if (value === undefined)
                return;
            fields.push(`${column} = ?`);
            values.push(value);
        };
        set("titulo", input.titulo);
        set("descripcion", input.descripcion);
        set("tipo", input.tipo);
        set("contenido", input.contenido);
        set("video_url", input.video_url);
        set("archivo_url", input.archivo_url);
        set("enlace_url", input.enlace_url);
        set("duracion_minutos", input.duracion_minutos);
        set("orden", input.orden);
        if (input.es_preview !== undefined)
            set("es_preview", input.es_preview ? 1 : 0);
        set("estado", input.estado);
        if (fields.length === 0)
            return;
        values.push(id);
        await db_1.pool.execute(`UPDATE lecciones
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, values);
    }
    async softDelete(id) {
        const [result] = await db_1.pool.execute(`UPDATE lecciones
       SET estado = 'inactivo', updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, [id]);
        return result.affectedRows > 0;
    }
    async markLessonComplete(userId, lessonId) {
        await db_1.pool.execute(`INSERT INTO progreso_lecciones
        (usuario_id, leccion_id, completado, fecha_completado, created_at, updated_at)
       VALUES
        (?, ?, 1, NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE
        completado = 1,
        fecha_completado = NOW(),
        updated_at = NOW()`, [userId, lessonId]);
    }
}
exports.LessonRepository = LessonRepository;
function mapLessonListRow(r) {
    return {
        id: r.id,
        modulo_id: r.modulo_id,
        titulo: r.titulo,
        descripcion: r.descripcion,
        tipo: r.tipo,
        duracion_minutos: r.duracion_minutos,
        orden: r.orden,
        es_preview: r.es_preview === 1,
        estado: r.estado,
    };
}
function mapLessonDetailRow(r) {
    return {
        ...mapLessonListRow(r),
        contenido: r.contenido,
        video_url: r.video_url,
        archivo_url: r.archivo_url,
        enlace_url: r.enlace_url,
        created_at: r.created_at,
        updated_at: r.updated_at,
    };
}
