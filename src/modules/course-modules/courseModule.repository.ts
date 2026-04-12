import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../../config/db";
import type { CourseEstado, CourseModuleItem, CourseModuleEstado } from "./courseModule.types";

type CourseRow = RowDataPacket & {
  id: number;
  docente_id: number;
  estado: CourseEstado;
};

type ModuleRow = RowDataPacket & {
  id: number;
  curso_id: number;
  titulo: string;
  descripcion: string | null;
  orden: number;
  estado: CourseModuleEstado;
};

export class CourseModuleRepository {
  async findCourseById(courseId: number): Promise<CourseRow | null> {
    const [rows] = await pool.query<CourseRow[]>(
      `SELECT id, docente_id, estado
       FROM cursos
       WHERE id = ?
       LIMIT 1`,
      [courseId]
    );
    return rows[0] ?? null;
  }

  async listByCourse(courseId: number, opts: { onlyActive: boolean }): Promise<CourseModuleItem[]> {
    const [rows] = await pool.query<ModuleRow[]>(
      `SELECT id, curso_id, titulo, descripcion, orden, estado
       FROM modulos
       WHERE curso_id = ?
         AND (? = 0 OR estado = 'activo')
       ORDER BY orden ASC, id ASC`,
      [courseId, opts.onlyActive ? 1 : 0]
    );
    return rows;
  }
}

