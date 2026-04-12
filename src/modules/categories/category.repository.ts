import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../../config/db";
import type { Category, CategoryAdminListItem, CreateCategoryInput, ListCategoriesQuery, UpdateCategoryInput } from "./category.types";

type CategoryRow = RowDataPacket & Category;
type CategoryAdminRow = RowDataPacket & CategoryAdminListItem;

export class CategoryRepository {
  async findByName(nombre: string): Promise<Category | null> {
    const [rows] = await pool.query<CategoryRow[]>(
      `SELECT id, nombre, descripcion, imagen_url, estado, created_at, updated_at
       FROM categorias
       WHERE nombre = ?
       LIMIT 1`,
      [nombre]
    );
    return rows[0] ?? null;
  }

  async listActive(): Promise<Category[]> {
    const [rows] = await pool.query<CategoryRow[]>(
      `SELECT id, nombre, descripcion, imagen_url, estado, created_at, updated_at
       FROM categorias
       WHERE estado = 'activo'
       ORDER BY nombre ASC`
    );
    return rows;
  }

  async listAdmin(q: ListCategoriesQuery): Promise<CategoryAdminListItem[]> {
    const where: string[] = ["1=1"];
    const params: Array<string | number> = [];

    if (q.estado) {
      where.push("cat.estado = ?");
      params.push(q.estado);
    }
    if (q.q) {
      where.push("cat.nombre LIKE ?");
      params.push(`%${q.q}%`);
    }

    const [rows] = await pool.query<CategoryAdminRow[]>(
      `SELECT
        cat.id,
        cat.nombre,
        cat.descripcion,
        cat.imagen_url,
        cat.estado,
        cat.created_at,
        cat.updated_at,
        COUNT(c.id) AS cursos_count
       FROM categorias cat
       LEFT JOIN cursos c ON c.categoria_id = cat.id
       WHERE ${where.join(" AND ")}
       GROUP BY cat.id
       ORDER BY cat.nombre ASC`,
      params
    );

    return rows.map((r) => ({ ...r, cursos_count: Number((r as { cursos_count?: unknown }).cursos_count ?? 0) }));
  }

  async findActiveById(id: number): Promise<Category | null> {
    const [rows] = await pool.query<CategoryRow[]>(
      `SELECT id, nombre, descripcion, imagen_url, estado, created_at, updated_at
       FROM categorias
       WHERE id = ? AND estado = 'activo'
       LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async findById(id: number): Promise<Category | null> {
    const [rows] = await pool.query<CategoryRow[]>(
      `SELECT id, nombre, descripcion, imagen_url, estado, created_at, updated_at
       FROM categorias
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async findByIdWithCount(id: number): Promise<CategoryAdminListItem | null> {
    const [rows] = await pool.query<CategoryAdminRow[]>(
      `SELECT
        cat.id,
        cat.nombre,
        cat.descripcion,
        cat.imagen_url,
        cat.estado,
        cat.created_at,
        cat.updated_at,
        COUNT(c.id) AS cursos_count
       FROM categorias cat
       LEFT JOIN cursos c ON c.categoria_id = cat.id
       WHERE cat.id = ?
       GROUP BY cat.id
       LIMIT 1`,
      [id]
    );
    const r = rows[0];
    if (!r) return null;
    return { ...r, cursos_count: Number((r as { cursos_count?: unknown }).cursos_count ?? 0) };
  }

  async countCoursesByCategoryId(id: number): Promise<number> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM cursos WHERE categoria_id = ?`,
      [id]
    );
    return Number((rows[0] as { total?: unknown } | undefined)?.total ?? 0);
  }

  async create(input: CreateCategoryInput): Promise<number> {
    const [result] = await pool.execute<ResultSetHeader>(
      `INSERT INTO categorias
        (nombre, descripcion, imagen_url, estado, created_at, updated_at)
       VALUES (?, ?, ?, 'activo', NOW(), NOW())`,
      [
        input.nombre,
        input.descripcion ?? null,
        input.imagen_url ?? null,
      ]
    );
    return result.insertId;
  }

  async updateById(id: number, input: UpdateCategoryInput): Promise<void> {
    const fields: string[] = [];
    const values: Array<string | number | null> = [];

    const set = <K extends keyof UpdateCategoryInput>(key: K, column: string) => {
      const value = input[key];
      if (value === undefined) return;
      fields.push(`${column} = ?`);
      values.push(value);
    };

    set("nombre", "nombre");
    set("descripcion", "descripcion");
    set("imagen_url", "imagen_url");
    set("estado", "estado");

    if (fields.length === 0) return;
    values.push(id);

    await pool.execute(
      `UPDATE categorias
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = ?
       LIMIT 1`,
      values
    );
  }

  async softDeleteById(id: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE categorias
       SET estado = 'inactivo', updated_at = NOW()
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return result.affectedRows > 0;
  }

  async updateStatusById(id: number, estado: "activo" | "inactivo"): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE categorias
       SET estado = ?, updated_at = NOW()
       WHERE id = ?
       LIMIT 1`,
      [estado, id]
    );
    return result.affectedRows > 0;
  }
}
