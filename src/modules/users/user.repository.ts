import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../../config/db";
import type { ListUsersParams, ListUsersResult, UpdateUserInput, UserPublic } from "./user.types";

type UserPublicRow = RowDataPacket & UserPublic;

export class UserRepository {
  private buildListWhere(params: ListUsersParams) {
    const where: string[] = [];
    const values: Array<string | number> = [];

    if (params.search) {
      const like = `%${params.search}%`;
      where.push(
        `(CONCAT_WS(' ', nombres, apellidos) LIKE ?
          OR correo LIKE ?
          OR CAST(id AS CHAR) LIKE ?
          OR rol LIKE ?
          OR estado LIKE ?)`
      );
      values.push(like, like, like, like, like);
    }

    return {
      whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
      values,
    };
  }

  async findById(id: number): Promise<UserPublic | null> {
    const [rows] = await pool.query<UserPublicRow[]>(
      `SELECT
        id, nombres, apellidos, dpi, correo, telefono, foto_url, fecha_nacimiento, direccion,
        rol, estado, ultimo_login, created_at, updated_at
       FROM usuarios
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async list(params: ListUsersParams): Promise<ListUsersResult> {
    const { whereSql, values } = this.buildListWhere(params);

    const [countRows] = await pool.query<(RowDataPacket & { total: number })[]>(
      `SELECT COUNT(*) as total
       FROM usuarios
       ${whereSql}`,
      values
    );
    const total = countRows[0]?.total ?? 0;

    const [rows] = await pool.query<UserPublicRow[]>(
      `SELECT
        id, nombres, apellidos, dpi, correo, telefono, foto_url, fecha_nacimiento, direccion,
        rol, estado, ultimo_login, created_at, updated_at
       FROM usuarios
       ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...values, params.limit, params.offset]
    );
    return { items: rows, total };
  }

  async updateById(id: number, input: UpdateUserInput): Promise<void> {
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    const set = <K extends keyof UpdateUserInput>(key: K, column: string) => {
      const value = input[key];
      if (value === undefined) return;
      fields.push(`${column} = ?`);
      values.push(value);
    };

    set("nombres", "nombres");
    set("apellidos", "apellidos");
    set("telefono", "telefono");
    set("foto_url", "foto_url");
    set("fecha_nacimiento", "fecha_nacimiento");
    set("direccion", "direccion");
    set("rol", "rol");
    set("estado", "estado");

    if (fields.length === 0) return;

    values.push(id);
    await pool.execute(
      `UPDATE usuarios
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = ?
       LIMIT 1`,
      values
    );
  }

  async deleteById(id: number): Promise<number> {
    const [res] = await pool.execute<ResultSetHeader>("DELETE FROM usuarios WHERE id = ? LIMIT 1", [
      id,
    ]);
    return res.affectedRows;
  }
}
