import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../../config/db";
import type { LessonAccessContext, LessonDetail, LessonListItem, LessonStatus, LessonType } from "./lesson.types";

type LessonListRow = RowDataPacket & {
  id: number;
  modulo_id: number;
  titulo: string;
  descripcion: string | null;
  tipo: LessonType;
  duracion_minutos: number | null;
  orden: number;
  es_preview: number;
  estado: LessonStatus;
};

type LessonDetailRow = LessonListRow & {
  contenido: string | null;
  video_url: string | null;
  archivo_url: string | null;
  enlace_url: string | null;
  created_at: string;
  updated_at: string;
};

type ModuleContextRow = RowDataPacket & {
  modulo_id: number;
  curso_id: number;
  curso_estado: "borrador" | "publicado" | "oculto";
  docente_id: number;
};

type LessonAccessRow = RowDataPacket & {
  lessonId: number;
  modulo_id: number;
  curso_id: number;
  curso_estado: "borrador" | "publicado" | "oculto";
  docente_id: number;
  es_preview: number;
  lesson_estado: LessonStatus;
};

export class LessonRepository {
  async getModuleContext(moduleId: number): Promise<ModuleContextRow | null> {
    const [rows] = await pool.query<ModuleContextRow[]>(
      `SELECT
        m.id as modulo_id,
        c.id as curso_id,
        c.estado as curso_estado,
        c.docente_id as docente_id
       FROM modulos m
       JOIN cursos c ON c.id = m.curso_id
       WHERE m.id = ?
       LIMIT 1`,
      [moduleId]
    );
    return rows[0] ?? null;
  }

  async userIsEnrolledActive(userId: number, courseId: number): Promise<boolean> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 1
       FROM inscripciones
       WHERE usuario_id = ? AND curso_id = ? AND estado = 'activa'
       LIMIT 1`,
      [userId, courseId]
    );
    return rows.length > 0;
  }

  async listLessons(moduleId: number, previewOnly: boolean): Promise<LessonListItem[]> {
    const [rows] = await pool.query<LessonListRow[]>(
      `SELECT id, modulo_id, titulo, descripcion, tipo, duracion_minutos, orden, es_preview, estado
       FROM lecciones
       WHERE modulo_id = ?
         AND estado = 'activo'
         AND (? = 0 OR es_preview = 1)
       ORDER BY orden ASC`,
      [moduleId, previewOnly ? 1 : 0]
    );
    return rows.map(mapLessonListRow);
  }

  async getLessonAccessContext(lessonId: number): Promise<LessonAccessContext | null> {
    const [rows] = await pool.query<LessonAccessRow[]>(
      `SELECT
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
       LIMIT 1`,
      [lessonId]
    );
    if (!rows[0]) return null;
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

  async findLessonById(lessonId: number): Promise<LessonDetail | null> {
    const [rows] = await pool.query<LessonDetailRow[]>(
      `SELECT
        id, modulo_id, titulo, descripcion, tipo, contenido, video_url, archivo_url, enlace_url,
        duracion_minutos, orden, es_preview, estado, created_at, updated_at
       FROM lecciones
       WHERE id = ?
       LIMIT 1`,
      [lessonId]
    );
    return rows[0] ? mapLessonDetailRow(rows[0]) : null;
  }

  async getNextOrder(moduleId: number): Promise<number> {
    const [rows] = await pool.query<(RowDataPacket & { nextOrder: number })[]>(
      `SELECT COALESCE(MAX(orden), 0) + 1 as nextOrder
       FROM lecciones
       WHERE modulo_id = ?`,
      [moduleId]
    );
    return rows[0]?.nextOrder ?? 1;
  }

  async createLesson(input: {
    modulo_id: number;
    titulo: string;
    descripcion: string | null;
    tipo: LessonType;
    contenido: string | null;
    video_url: string | null;
    archivo_url: string | null;
    enlace_url: string | null;
    duracion_minutos: number | null;
    orden: number;
    es_preview: boolean;
  }): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO lecciones
        (modulo_id, titulo, descripcion, tipo, contenido, video_url, archivo_url, enlace_url,
         duracion_minutos, orden, es_preview, estado, created_at, updated_at)
       VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activo', NOW(), NOW())`,
      [
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
      ]
    );
    return result.insertId;
  }

  async updateLessonById(
    id: number,
    input: Partial<{
      titulo: string;
      descripcion: string | null;
      tipo: LessonType;
      contenido: string | null;
      video_url: string | null;
      archivo_url: string | null;
      enlace_url: string | null;
      duracion_minutos: number | null;
      orden: number;
      es_preview: boolean;
      estado: LessonStatus;
    }>
  ): Promise<void> {
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    const set = <T extends string | number | null | undefined>(column: string, value: T) => {
      if (value === undefined) return;
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
    if (input.es_preview !== undefined) set("es_preview", input.es_preview ? 1 : 0);
    set("estado", input.estado);

    if (fields.length === 0) return;
    values.push(id);

    await pool.execute(
      `UPDATE lecciones
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = ?
       LIMIT 1`,
      values
    );
  }

  async softDelete(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE lecciones
       SET estado = 'inactivo', updated_at = NOW()
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return result.affectedRows > 0;
  }

  async markLessonComplete(userId: number, lessonId: number): Promise<void> {
    await pool.execute(
      `INSERT INTO progreso_lecciones
        (usuario_id, leccion_id, completado, fecha_completado, created_at, updated_at)
       VALUES
        (?, ?, 1, NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE
        completado = 1,
        fecha_completado = NOW(),
        updated_at = NOW()`,
      [userId, lessonId]
    );
  }
}

function mapLessonListRow(r: LessonListRow): LessonListItem {
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

function mapLessonDetailRow(r: LessonDetailRow): LessonDetail {
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

