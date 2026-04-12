import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../../config/db";
import type { PricingSetting, PricingStatus } from "./pricing.types";

type PricingRow = RowDataPacket & {
  id: number;
  nombre: string;
  precio: number;
  payment_link: string;
  estado: PricingStatus;
  created_at: string;
  updated_at: string;
};

export class PricingRepository {
  async list(estado?: PricingStatus): Promise<PricingSetting[]> {
    const where = estado ? "WHERE estado = ?" : "";
    const params: Array<string> = estado ? [estado] : [];
    const [rows] = await pool.query<PricingRow[]>(
      `SELECT id, nombre, precio, payment_link, estado, created_at, updated_at
       FROM pricing_settings
       ${where}
       ORDER BY precio ASC, id ASC`,
      params
    );
    return rows;
  }

  async findById(id: number): Promise<PricingSetting | null> {
    const [rows] = await pool.query<PricingRow[]>(
      `SELECT id, nombre, precio, payment_link, estado, created_at, updated_at
       FROM pricing_settings
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async findByNombre(nombre: string): Promise<PricingSetting | null> {
    const [rows] = await pool.query<PricingRow[]>(
      `SELECT id, nombre, precio, payment_link, estado, created_at, updated_at
       FROM pricing_settings
       WHERE nombre = ?
       LIMIT 1`,
      [nombre]
    );
    return rows[0] ?? null;
  }

  async create(input: { nombre: string; precio: number; payment_link: string }): Promise<number> {
    const [res] = await pool.execute<ResultSetHeader>(
      `INSERT INTO pricing_settings (nombre, precio, payment_link, estado)
       VALUES (?, ?, ?, 'activo')`,
      [input.nombre, input.precio, input.payment_link]
    );
    return Number(res.insertId);
  }

  async updateById(
    id: number,
    input: Partial<{ nombre: string; precio: number; payment_link: string; estado: PricingStatus }>
  ): Promise<boolean> {
    const fields: string[] = [];
    const values: Array<string | number> = [];

    if (input.nombre !== undefined) {
      fields.push("nombre = ?");
      values.push(input.nombre);
    }
    if (input.precio !== undefined) {
      fields.push("precio = ?");
      values.push(input.precio);
    }
    if (input.payment_link !== undefined) {
      fields.push("payment_link = ?");
      values.push(input.payment_link);
    }
    if (input.estado !== undefined) {
      fields.push("estado = ?");
      values.push(input.estado);
    }

    if (fields.length === 0) return true;

    values.push(id);
    const [res] = await pool.execute<ResultSetHeader>(
      `UPDATE pricing_settings SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
    return Number(res.affectedRows) > 0;
  }

  async updateStatusById(id: number, estado: PricingStatus): Promise<boolean> {
    const [res] = await pool.execute<ResultSetHeader>(
      `UPDATE pricing_settings SET estado = ? WHERE id = ?`,
      [estado, id]
    );
    return Number(res.affectedRows) > 0;
  }
}
