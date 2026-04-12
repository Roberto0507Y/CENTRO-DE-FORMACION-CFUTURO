import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../../config/db";
import type { CourseFileAccessContext, StoredFile, StoredFileAccessScope } from "./file.types";

type StoredFileRow = RowDataPacket & StoredFile;
type CourseAccessRow = RowDataPacket & {
  docente_id: number;
  curso_estado: CourseFileAccessContext["curso_estado"];
  inscripcion_id: number | null;
};

export type CreateStoredFileInput = {
  s3_key: string;
  nombre_original: string;
  mime_type: string;
  size_bytes?: number | null;
  owner_usuario_id?: number | null;
  curso_id?: number | null;
  access_scope?: StoredFileAccessScope;
};

export class FileRepository {
  async findById(id: number): Promise<StoredFile | null> {
    const [rows] = await pool.query<StoredFileRow[]>(
      `SELECT
        id, s3_key, nombre_original, mime_type, size_bytes, owner_usuario_id,
        curso_id, access_scope, created_at, updated_at
       FROM archivos
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async create(input: CreateStoredFileInput): Promise<number> {
    const [res] = await pool.execute<ResultSetHeader>(
      `INSERT INTO archivos
        (s3_key, nombre_original, mime_type, size_bytes, owner_usuario_id, curso_id, access_scope)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.s3_key,
        input.nombre_original,
        input.mime_type,
        input.size_bytes ?? null,
        input.owner_usuario_id ?? null,
        input.curso_id ?? null,
        input.access_scope ?? "owner",
      ]
    );
    return res.insertId;
  }

  async deleteById(id: number): Promise<void> {
    await pool.execute(`DELETE FROM archivos WHERE id = ? LIMIT 1`, [id]);
  }

  async getCourseAccessContext(courseId: number, userId: number): Promise<CourseFileAccessContext | null> {
    const [rows] = await pool.query<CourseAccessRow[]>(
      `SELECT
        c.docente_id,
        c.estado AS curso_estado,
        i.id AS inscripcion_id
       FROM cursos c
       LEFT JOIN inscripciones i
         ON i.curso_id = c.id
        AND i.usuario_id = ?
        AND i.estado = 'activa'
       WHERE c.id = ?
       LIMIT 1`,
      [userId, courseId]
    );

    const row = rows[0];
    if (!row) return null;
    return {
      docente_id: row.docente_id,
      curso_estado: row.curso_estado,
      enrolled: Boolean(row.inscripcion_id),
    };
  }
}
