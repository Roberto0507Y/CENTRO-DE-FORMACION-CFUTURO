import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../../config/db";
import type { AttendanceStatus, AttendanceStudentItem, UpsertAttendanceItemInput } from "./attendance.types";

type CourseRow = RowDataPacket & { id: number; docente_id: number; estado: "borrador" | "publicado" | "oculto" };

type StudentRow = RowDataPacket & {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
  foto_url: string | null;
};

type AttendanceRow = RowDataPacket & {
  id: number;
  curso_id: number;
  estudiante_id: number;
  fecha: string;
  estado: AttendanceStatus;
  comentario: string | null;
  registrado_por: number;
};

type ColumnExistsRow = RowDataPacket & { cnt: number };

export class AttendanceRepository {
  private static columnCache = new Map<string, boolean>();

  private static async hasColumn(table: string, column: string): Promise<boolean> {
    const key = `${table}.${column}`;
    const cached = AttendanceRepository.columnCache.get(key);
    if (cached !== undefined) return cached;

    const [rows] = await pool.query<ColumnExistsRow[]>(
      `SELECT COUNT(*) AS cnt
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = ?`,
      [table, column]
    );

    const exists = Number(rows[0]?.cnt ?? 0) > 0;
    AttendanceRepository.columnCache.set(key, exists);
    return exists;
  }

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

  async listActiveStudents(courseId: number): Promise<StudentRow[]> {
    const [rows] = await pool.query<StudentRow[]>(
      `SELECT
        u.id, u.nombres, u.apellidos, u.correo, u.foto_url
       FROM inscripciones i
       JOIN usuarios u ON u.id = i.usuario_id
       WHERE i.curso_id = ? AND i.estado = 'activa'
       ORDER BY u.apellidos ASC, u.nombres ASC`,
      [courseId]
    );
    return rows;
  }

  async listByCourseDate(courseId: number, date: string): Promise<AttendanceRow[]> {
    const [rows] = await pool.query<AttendanceRow[]>(
      `SELECT id, curso_id, estudiante_id, DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha, estado, comentario, registrado_por
       FROM asistencias
       WHERE curso_id = ? AND fecha = ?
       ORDER BY id ASC`,
      [courseId, date]
    );
    return rows;
  }

  async upsertMany(
    conn: PoolConnection,
    input: {
      courseId: number;
      date: string;
      registeredBy: number;
      items: UpsertAttendanceItemInput[];
    }
  ): Promise<void> {
    const hasUpdatedAt = await AttendanceRepository.hasColumn("asistencias", "updated_at");
    for (const item of input.items) {
      await conn.execute<ResultSetHeader>(
        hasUpdatedAt
          ? `INSERT INTO asistencias
              (curso_id, estudiante_id, fecha, estado, comentario, registrado_por, created_at, updated_at)
             VALUES
              (?, ?, ?, ?, ?, ?, NOW(), NOW())
             ON DUPLICATE KEY UPDATE
               estado = VALUES(estado),
               comentario = VALUES(comentario),
               registrado_por = VALUES(registrado_por),
               updated_at = NOW()`
          : `INSERT INTO asistencias
              (curso_id, estudiante_id, fecha, estado, comentario, registrado_por, created_at)
             VALUES
              (?, ?, ?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               estado = VALUES(estado),
               comentario = VALUES(comentario),
               registrado_por = VALUES(registrado_por)`,
        [
          input.courseId,
          item.estudiante_id,
          input.date,
          item.estado,
          item.comentario ?? null,
          input.registeredBy,
        ]
      );
    }
  }

  async buildStudentItems(courseId: number, date: string): Promise<AttendanceStudentItem[]> {
    const students = await this.listActiveStudents(courseId);
    const attendance = await this.listByCourseDate(courseId, date);
    const byStudent = new Map<number, AttendanceRow>();
    attendance.forEach((a) => byStudent.set(a.estudiante_id, a));

    return students.map((s) => {
      const a = byStudent.get(s.id);
      return {
        estudiante: {
          id: s.id,
          nombres: s.nombres,
          apellidos: s.apellidos,
          correo: s.correo,
          foto_url: s.foto_url,
        },
        asistencia: a
          ? {
              id: a.id,
              fecha: a.fecha,
              estado: a.estado,
              comentario: a.comentario,
              registrado_por: a.registrado_por,
            }
          : null,
      };
    });
  }
}
