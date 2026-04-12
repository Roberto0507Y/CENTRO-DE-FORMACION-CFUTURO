"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForumRepository = void 0;
const db_1 = require("../../config/db");
class ForumRepository {
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
    async listTopics(courseId, opts) {
        const topicWhere = opts.includeHidden ? "" : "AND t.estado <> 'oculto'";
        const replyCountWhere = opts.includeHiddenRepliesCount ? "" : "AND r.estado = 'activo'";
        const lastReplyWhere = opts.includeHiddenRepliesCount ? "" : "AND r2.estado = 'activo'";
        const [rows] = await db_1.pool.query(`SELECT
         t.id, t.curso_id, t.usuario_id, t.titulo, t.mensaje, t.estado, t.fijado,
         t.created_at, t.updated_at,
         u.id AS autor_id, u.nombres AS autor_nombres, u.apellidos AS autor_apellidos,
         u.correo AS autor_correo, u.foto_url AS autor_foto_url,
         (
           SELECT COUNT(*)
           FROM foros_respuestas r
           WHERE r.tema_id = t.id ${replyCountWhere}
         ) AS respuestas_count,
         (
           SELECT MAX(r2.created_at)
           FROM foros_respuestas r2
           WHERE r2.tema_id = t.id ${lastReplyWhere}
         ) AS last_reply_at
       FROM foros_temas t
       JOIN usuarios u ON u.id = t.usuario_id
       WHERE t.curso_id = ? ${topicWhere}
       ORDER BY t.fijado DESC, t.created_at DESC, t.id DESC`, [courseId]);
        return rows.map((r) => ({
            id: r.id,
            curso_id: r.curso_id,
            usuario_id: r.usuario_id,
            titulo: r.titulo,
            mensaje: r.mensaje,
            estado: r.estado,
            fijado: r.fijado,
            created_at: r.created_at,
            updated_at: r.updated_at,
            respuestas_count: Number(r.respuestas_count ?? 0),
            last_reply_at: r.last_reply_at ?? null,
            autor: {
                id: r.autor_id,
                nombres: r.autor_nombres,
                apellidos: r.autor_apellidos,
                correo: r.autor_correo,
                foto_url: r.autor_foto_url,
            },
        }));
    }
    async findTopic(courseId, topicId) {
        const [rows] = await db_1.pool.query(`SELECT id, curso_id, usuario_id, titulo, mensaje, estado, fijado, created_at, updated_at
       FROM foros_temas
       WHERE curso_id = ? AND id = ?
       LIMIT 1`, [courseId, topicId]);
        return rows[0] ?? null;
    }
    async getTopicDetail(courseId, topicId, opts) {
        const topic = await this.findTopic(courseId, topicId);
        if (!topic)
            return null;
        if (!opts.includeHidden && topic.estado === "oculto")
            return null;
        const replyWhere = opts.includeHiddenReplies ? "" : "AND r.estado = 'activo'";
        const [topicRows] = await db_1.pool.query(`SELECT
         t.id, t.curso_id, t.usuario_id, t.titulo, t.mensaje, t.estado, t.fijado, t.created_at, t.updated_at,
         u.id AS autor_id, u.nombres AS autor_nombres, u.apellidos AS autor_apellidos,
         u.correo AS autor_correo, u.foto_url AS autor_foto_url
       FROM foros_temas t
       JOIN usuarios u ON u.id = t.usuario_id
       WHERE t.curso_id = ? AND t.id = ?
       LIMIT 1`, [courseId, topicId]);
        const tr = topicRows[0];
        if (!tr)
            return null;
        const [replyRows] = await db_1.pool.query(`SELECT
         r.id, r.tema_id, r.usuario_id, r.mensaje, r.estado, r.created_at, r.updated_at,
         u.id AS autor_id, u.nombres AS autor_nombres, u.apellidos AS autor_apellidos,
         u.correo AS autor_correo, u.foto_url AS autor_foto_url
       FROM foros_respuestas r
       JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.tema_id = ? ${replyWhere}
       ORDER BY r.created_at ASC, r.id ASC`, [topicId]);
        const respuestas = replyRows.map((r) => ({
            id: r.id,
            tema_id: r.tema_id,
            usuario_id: r.usuario_id,
            mensaje: r.mensaje,
            estado: r.estado,
            created_at: r.created_at,
            updated_at: r.updated_at,
            autor: {
                id: r.autor_id,
                nombres: r.autor_nombres,
                apellidos: r.autor_apellidos,
                correo: r.autor_correo,
                foto_url: r.autor_foto_url,
            },
        }));
        return {
            id: tr.id,
            curso_id: tr.curso_id,
            usuario_id: tr.usuario_id,
            titulo: tr.titulo,
            mensaje: tr.mensaje,
            estado: tr.estado,
            fijado: tr.fijado,
            created_at: tr.created_at,
            updated_at: tr.updated_at,
            autor: {
                id: tr.autor_id,
                nombres: tr.autor_nombres,
                apellidos: tr.autor_apellidos,
                correo: tr.autor_correo,
                foto_url: tr.autor_foto_url,
            },
            respuestas,
            respuestas_count: respuestas.length,
        };
    }
    async createTopic(conn, input) {
        const [res] = await conn.query(`INSERT INTO foros_temas (curso_id, usuario_id, titulo, mensaje)
       VALUES (?, ?, ?, ?)`, [input.curso_id, input.usuario_id, input.titulo, input.mensaje]);
        return res.insertId;
    }
    async createReply(conn, input) {
        const [res] = await conn.query(`INSERT INTO foros_respuestas (tema_id, usuario_id, mensaje)
       VALUES (?, ?, ?)`, [input.tema_id, input.usuario_id, input.mensaje]);
        return res.insertId;
    }
    async updateTopicModeration(conn, courseId, topicId, patch) {
        const fields = [];
        const params = [];
        if (patch.estado !== undefined) {
            fields.push("estado = ?");
            params.push(patch.estado);
        }
        if (patch.fijado !== undefined) {
            fields.push("fijado = ?");
            params.push(patch.fijado);
        }
        if (fields.length === 0)
            return 0;
        params.push(courseId, topicId);
        const [res] = await conn.query(`UPDATE foros_temas SET ${fields.join(", ")} WHERE curso_id = ? AND id = ?`, params);
        return res.affectedRows;
    }
    async updateReplyStatus(conn, topicId, replyId, estado) {
        const [res] = await conn.query(`UPDATE foros_respuestas SET estado = ? WHERE tema_id = ? AND id = ?`, [estado, topicId, replyId]);
        return res.affectedRows;
    }
}
exports.ForumRepository = ForumRepository;
