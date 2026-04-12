import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { PoolConnection } from "mysql2/promise";
import { pool } from "../../config/db";
import type {
  ForumReply,
  ForumReplyStatus,
  ForumTopic,
  ForumTopicDetail,
  ForumTopicListItem,
  ForumTopicStatus,
} from "./forum.types";

type CourseRow = RowDataPacket & { id: number; docente_id: number; estado: "borrador" | "publicado" | "oculto" };
type EnrollmentRow = RowDataPacket & { id: number };
type TopicRow = RowDataPacket & ForumTopic;
type TopicListRow = RowDataPacket &
  ForumTopic & {
    autor_id: number;
    autor_nombres: string;
    autor_apellidos: string;
    autor_correo: string;
    autor_foto_url: string | null;
    respuestas_count: number;
    last_reply_at: string | null;
  };

type ReplyRow = RowDataPacket &
  ForumReply & {
    autor_id: number;
    autor_nombres: string;
    autor_apellidos: string;
    autor_correo: string;
    autor_foto_url: string | null;
  };

export class ForumRepository {
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

  async listTopics(courseId: number, opts: { includeHidden: boolean; includeHiddenRepliesCount: boolean }): Promise<ForumTopicListItem[]> {
    const topicWhere = opts.includeHidden ? "" : "AND t.estado <> 'oculto'";
    const replyCountWhere = opts.includeHiddenRepliesCount ? "" : "AND r.estado = 'activo'";
    const lastReplyWhere = opts.includeHiddenRepliesCount ? "" : "AND r2.estado = 'activo'";

    const [rows] = await pool.query<TopicListRow[]>(
      `SELECT
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
       ORDER BY t.fijado DESC, t.created_at DESC, t.id DESC`,
      [courseId]
    );

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

  async findTopic(courseId: number, topicId: number): Promise<ForumTopic | null> {
    const [rows] = await pool.query<TopicRow[]>(
      `SELECT id, curso_id, usuario_id, titulo, mensaje, estado, fijado, created_at, updated_at
       FROM foros_temas
       WHERE curso_id = ? AND id = ?
       LIMIT 1`,
      [courseId, topicId]
    );
    return rows[0] ?? null;
  }

  async getTopicDetail(courseId: number, topicId: number, opts: { includeHidden: boolean; includeHiddenReplies: boolean }): Promise<ForumTopicDetail | null> {
    const topic = await this.findTopic(courseId, topicId);
    if (!topic) return null;

    if (!opts.includeHidden && topic.estado === "oculto") return null;

    const replyWhere = opts.includeHiddenReplies ? "" : "AND r.estado = 'activo'";

    const [topicRows] = await pool.query<
      (RowDataPacket & {
        autor_id: number;
        autor_nombres: string;
        autor_apellidos: string;
        autor_correo: string;
        autor_foto_url: string | null;
      })[]
    >(
      `SELECT
         t.id, t.curso_id, t.usuario_id, t.titulo, t.mensaje, t.estado, t.fijado, t.created_at, t.updated_at,
         u.id AS autor_id, u.nombres AS autor_nombres, u.apellidos AS autor_apellidos,
         u.correo AS autor_correo, u.foto_url AS autor_foto_url
       FROM foros_temas t
       JOIN usuarios u ON u.id = t.usuario_id
       WHERE t.curso_id = ? AND t.id = ?
       LIMIT 1`,
      [courseId, topicId]
    );
    const tr = topicRows[0];
    if (!tr) return null;

    const [replyRows] = await pool.query<ReplyRow[]>(
      `SELECT
         r.id, r.tema_id, r.usuario_id, r.mensaje, r.estado, r.created_at, r.updated_at,
         u.id AS autor_id, u.nombres AS autor_nombres, u.apellidos AS autor_apellidos,
         u.correo AS autor_correo, u.foto_url AS autor_foto_url
       FROM foros_respuestas r
       JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.tema_id = ? ${replyWhere}
       ORDER BY r.created_at ASC, r.id ASC`,
      [topicId]
    );

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

  async createTopic(conn: PoolConnection, input: { curso_id: number; usuario_id: number; titulo: string; mensaje: string }): Promise<number> {
    const [res] = await conn.query<ResultSetHeader>(
      `INSERT INTO foros_temas (curso_id, usuario_id, titulo, mensaje)
       VALUES (?, ?, ?, ?)`,
      [input.curso_id, input.usuario_id, input.titulo, input.mensaje]
    );
    return res.insertId;
  }

  async createReply(conn: PoolConnection, input: { tema_id: number; usuario_id: number; mensaje: string }): Promise<number> {
    const [res] = await conn.query<ResultSetHeader>(
      `INSERT INTO foros_respuestas (tema_id, usuario_id, mensaje)
       VALUES (?, ?, ?)`,
      [input.tema_id, input.usuario_id, input.mensaje]
    );
    return res.insertId;
  }

  async updateTopicModeration(conn: PoolConnection, courseId: number, topicId: number, patch: { estado?: ForumTopicStatus; fijado?: 0 | 1 }): Promise<number> {
    const fields: string[] = [];
    const params: Array<string | number> = [];
    if (patch.estado !== undefined) {
      fields.push("estado = ?");
      params.push(patch.estado);
    }
    if (patch.fijado !== undefined) {
      fields.push("fijado = ?");
      params.push(patch.fijado);
    }
    if (fields.length === 0) return 0;
    params.push(courseId, topicId);
    const [res] = await conn.query<ResultSetHeader>(
      `UPDATE foros_temas SET ${fields.join(", ")} WHERE curso_id = ? AND id = ?`,
      params
    );
    return res.affectedRows;
  }

  async updateReplyStatus(conn: PoolConnection, topicId: number, replyId: number, estado: ForumReplyStatus): Promise<number> {
    const [res] = await conn.query<ResultSetHeader>(
      `UPDATE foros_respuestas SET estado = ? WHERE tema_id = ? AND id = ?`,
      [estado, topicId, replyId]
    );
    return res.affectedRows;
  }
}
