import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type { PoolConnection } from "mysql2/promise";
import { pool } from "../../config/db";
import type { AnnouncementListItem, AnnouncementStatus } from "./announcement.types";

type CourseRow = RowDataPacket & { id: number; docente_id: number; estado: "borrador" | "publicado" | "oculto" };

type AnnouncementRow = RowDataPacket & {
  id: number;
  curso_id: number;
  usuario_id: number;
  titulo: string;
  mensaje: string;
  archivo_url: string | null;
  estado: AnnouncementStatus;
  fecha_publicacion: string;
  created_at: string;
  updated_at: string;
  autor_id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  foto_url: string | null;
};

type EnrollmentRow = RowDataPacket & { id: number };

export class AnnouncementRepository {
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

  async listByCourse(courseId: number, status?: AnnouncementStatus): Promise<AnnouncementListItem[]> {
    const whereStatus = status ? "AND a.estado = ?" : "";
    const params: Array<string | number> = status ? [courseId, status] : [courseId];

    const [rows] = await pool.query<AnnouncementRow[]>(
      `SELECT
        a.id,
        a.curso_id,
        a.usuario_id,
        a.titulo,
        a.mensaje,
        a.archivo_url,
        a.estado,
        a.fecha_publicacion,
        a.created_at,
        a.updated_at,
        u.id AS autor_id,
        u.nombres,
        u.apellidos,
        u.correo,
        u.foto_url
       FROM anuncios a
       JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.curso_id = ?
       ${whereStatus}
       ORDER BY a.fecha_publicacion DESC, a.id DESC`,
      params
    );

    return rows.map((r) => ({
      id: r.id,
      curso_id: r.curso_id,
      usuario_id: r.usuario_id,
      titulo: r.titulo,
      mensaje: r.mensaje,
      archivo_url: r.archivo_url,
      estado: r.estado,
      fecha_publicacion: r.fecha_publicacion,
      created_at: r.created_at,
      updated_at: r.updated_at,
      autor: {
        id: r.autor_id,
        nombres: r.nombres,
        apellidos: r.apellidos,
        correo: r.correo,
        foto_url: r.foto_url,
      },
    }));
  }

  async findById(courseId: number, id: number): Promise<AnnouncementListItem | null> {
    const [rows] = await pool.query<AnnouncementRow[]>(
      `SELECT
        a.id,
        a.curso_id,
        a.usuario_id,
        a.titulo,
        a.mensaje,
        a.archivo_url,
        a.estado,
        a.fecha_publicacion,
        a.created_at,
        a.updated_at,
        u.id AS autor_id,
        u.nombres,
        u.apellidos,
        u.correo,
        u.foto_url
       FROM anuncios a
       JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.curso_id = ? AND a.id = ?
       LIMIT 1`,
      [courseId, id]
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: r.id,
      curso_id: r.curso_id,
      usuario_id: r.usuario_id,
      titulo: r.titulo,
      mensaje: r.mensaje,
      archivo_url: r.archivo_url,
      estado: r.estado,
      fecha_publicacion: r.fecha_publicacion,
      created_at: r.created_at,
      updated_at: r.updated_at,
      autor: {
        id: r.autor_id,
        nombres: r.nombres,
        apellidos: r.apellidos,
        correo: r.correo,
        foto_url: r.foto_url,
      },
    };
  }

  async create(
    conn: PoolConnection,
    input: {
      curso_id: number;
      usuario_id: number;
      titulo: string;
      mensaje: string;
      archivo_url: string | null;
      estado: AnnouncementStatus;
    }
  ): Promise<number> {
    const [res] = await conn.execute<ResultSetHeader>(
      `INSERT INTO anuncios
        (curso_id, usuario_id, titulo, mensaje, archivo_url, estado, fecha_publicacion, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
      [input.curso_id, input.usuario_id, input.titulo, input.mensaje, input.archivo_url, input.estado]
    );
    return res.insertId;
  }

  async updateById(
    conn: PoolConnection,
    courseId: number,
    id: number,
    input: Partial<{ titulo: string; mensaje: string; archivo_url: string | null }>
  ): Promise<number> {
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    const set = (key: keyof typeof input, column: string) => {
      const value = input[key];
      if (value === undefined) return;
      fields.push(`${column} = ?`);
      values.push(value as unknown as string | number | null);
    };

    set("titulo", "titulo");
    set("mensaje", "mensaje");
    set("archivo_url", "archivo_url");

    if (fields.length === 0) return 0;
    values.push(courseId, id);

    const [res] = await conn.execute<ResultSetHeader>(
      `UPDATE anuncios
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE curso_id = ? AND id = ?
       LIMIT 1`,
      values
    );
    return res.affectedRows;
  }

  async updateStatus(
    conn: PoolConnection,
    courseId: number,
    id: number,
    estado: AnnouncementStatus
  ): Promise<number> {
    const [res] = await conn.execute<ResultSetHeader>(
      `UPDATE anuncios
       SET estado = ?,
           fecha_publicacion = CASE WHEN ? = 'publicado' THEN NOW() ELSE fecha_publicacion END,
           updated_at = NOW()
       WHERE curso_id = ? AND id = ?
       LIMIT 1`,
      [estado, estado, courseId, id]
    );
    return res.affectedRows;
  }
}

