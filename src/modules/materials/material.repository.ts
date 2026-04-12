import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../../config/db";
import type { CreateMaterialInput, Material, MaterialStatus, UpdateMaterialInput } from "./material.types";

type MaterialRow = RowDataPacket & Material;
type CourseOwnerRow = RowDataPacket & { docente_id: number; curso_estado: "borrador" | "publicado" | "oculto" };
type EnrollmentRow = RowDataPacket & { id: number };
type ModuleRow = RowDataPacket & { id: number };
type NextOrderRow = RowDataPacket & { next_order: number };

export class MaterialRepository {
  async findCourseOwner(courseId: number): Promise<{ docente_id: number; curso_estado: CourseOwnerRow["curso_estado"] } | null> {
    const [rows] = await pool.query<CourseOwnerRow[]>(
      `SELECT docente_id, estado AS curso_estado
       FROM cursos
       WHERE id = ?
       LIMIT 1`,
      [courseId]
    );
    return rows[0] ?? null;
  }

  async isEnrolledActive(courseId: number, userId: number): Promise<boolean> {
    const [rows] = await pool.query<EnrollmentRow[]>(
      `SELECT id
       FROM inscripciones
       WHERE curso_id = ? AND usuario_id = ? AND estado = 'activa'
       LIMIT 1`,
      [courseId, userId]
    );
    return Boolean(rows[0]);
  }

  async moduleBelongsToCourse(moduleId: number, courseId: number): Promise<boolean> {
    const [rows] = await pool.query<ModuleRow[]>(
      `SELECT id FROM modulos WHERE id = ? AND curso_id = ? LIMIT 1`,
      [moduleId, courseId]
    );
    return Boolean(rows[0]);
  }

  async listByCourse(courseId: number): Promise<Material[]> {
    const [rows] = await pool.query<MaterialRow[]>(
      `SELECT
        id, curso_id, modulo_id, titulo, descripcion, tipo, archivo_url, enlace_url,
        orden, estado, created_at, updated_at
       FROM materiales
       WHERE curso_id = ?
       ORDER BY orden ASC, id ASC`,
      [courseId]
    );
    return rows;
  }

  async listActiveByCourse(courseId: number): Promise<Material[]> {
    const [rows] = await pool.query<MaterialRow[]>(
      `SELECT
        id, curso_id, modulo_id, titulo, descripcion, tipo, archivo_url, enlace_url,
        orden, estado, created_at, updated_at
       FROM materiales
       WHERE curso_id = ? AND estado = 'activo'
       ORDER BY orden ASC, id ASC`,
      [courseId]
    );
    return rows;
  }

  async findById(courseId: number, id: number): Promise<Material | null> {
    const [rows] = await pool.query<MaterialRow[]>(
      `SELECT
        id, curso_id, modulo_id, titulo, descripcion, tipo, archivo_url, enlace_url,
        orden, estado, created_at, updated_at
       FROM materiales
       WHERE curso_id = ? AND id = ?
       LIMIT 1`,
      [courseId, id]
    );
    return rows[0] ?? null;
  }

  async getNextOrder(courseId: number, moduloId: number | null): Promise<number> {
    if (moduloId === null) {
      const [rows] = await pool.query<NextOrderRow[]>(
        `SELECT COALESCE(MAX(orden), 0) + 1 AS next_order
         FROM materiales
         WHERE curso_id = ? AND modulo_id IS NULL`,
        [courseId]
      );
      return rows[0]?.next_order ?? 1;
    }
    const [rows] = await pool.query<NextOrderRow[]>(
      `SELECT COALESCE(MAX(orden), 0) + 1 AS next_order
       FROM materiales
       WHERE curso_id = ? AND modulo_id = ?`,
      [courseId, moduloId]
    );
    return rows[0]?.next_order ?? 1;
  }

  async create(courseId: number, input: Required<CreateMaterialInput>): Promise<number> {
    const [res] = await pool.query<ResultSetHeader>(
      `INSERT INTO materiales
        (curso_id, modulo_id, titulo, descripcion, tipo, archivo_url, enlace_url, orden, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseId,
        input.modulo_id ?? null,
        input.titulo,
        input.descripcion ?? null,
        input.tipo,
        input.archivo_url ?? null,
        input.enlace_url ?? null,
        input.orden,
        input.estado,
      ]
    );
    return res.insertId;
  }

  async update(courseId: number, id: number, input: UpdateMaterialInput): Promise<void> {
    const fields: string[] = [];
    const params: Array<string | number | null> = [];

    const set = (col: string, v: string | number | null) => {
      fields.push(`${col} = ?`);
      params.push(v);
    };

    if (input.modulo_id !== undefined) set("modulo_id", input.modulo_id ?? null);
    if (input.titulo !== undefined) set("titulo", input.titulo);
    if (input.descripcion !== undefined) set("descripcion", input.descripcion ?? null);
    if (input.tipo !== undefined) set("tipo", input.tipo);
    if (input.archivo_url !== undefined) set("archivo_url", input.archivo_url ?? null);
    if (input.enlace_url !== undefined) set("enlace_url", input.enlace_url ?? null);
    if (input.orden !== undefined) set("orden", input.orden);
    if (input.estado !== undefined) set("estado", input.estado);

    if (fields.length === 0) return;

    params.push(courseId, id);
    await pool.query(
      `UPDATE materiales SET ${fields.join(", ")} WHERE curso_id = ? AND id = ?`,
      params
    );
  }

  async patchStatus(courseId: number, id: number, estado: MaterialStatus): Promise<void> {
    await pool.query(`UPDATE materiales SET estado = ? WHERE curso_id = ? AND id = ?`, [estado, courseId, id]);
  }
}

