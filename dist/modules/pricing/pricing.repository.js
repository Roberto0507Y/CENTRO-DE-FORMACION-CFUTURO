"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingRepository = void 0;
const db_1 = require("../../config/db");
class PricingRepository {
    async list(estado) {
        const where = estado ? "WHERE estado = ?" : "";
        const params = estado ? [estado] : [];
        const [rows] = await db_1.pool.query(`SELECT id, nombre, precio, payment_link, estado, created_at, updated_at
       FROM pricing_settings
       ${where}
       ORDER BY precio ASC, id ASC`, params);
        return rows;
    }
    async findById(id) {
        const [rows] = await db_1.pool.query(`SELECT id, nombre, precio, payment_link, estado, created_at, updated_at
       FROM pricing_settings
       WHERE id = ?
       LIMIT 1`, [id]);
        return rows[0] ?? null;
    }
    async findByNombre(nombre) {
        const [rows] = await db_1.pool.query(`SELECT id, nombre, precio, payment_link, estado, created_at, updated_at
       FROM pricing_settings
       WHERE nombre = ?
       LIMIT 1`, [nombre]);
        return rows[0] ?? null;
    }
    async create(input) {
        const [res] = await db_1.pool.execute(`INSERT INTO pricing_settings (nombre, precio, payment_link, estado)
       VALUES (?, ?, ?, 'activo')`, [input.nombre, input.precio, input.payment_link]);
        return Number(res.insertId);
    }
    async updateById(id, input) {
        const fields = [];
        const values = [];
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
        if (fields.length === 0)
            return true;
        values.push(id);
        const [res] = await db_1.pool.execute(`UPDATE pricing_settings SET ${fields.join(", ")} WHERE id = ?`, values);
        return Number(res.affectedRows) > 0;
    }
    async updateStatusById(id, estado) {
        const [res] = await db_1.pool.execute(`UPDATE pricing_settings SET estado = ? WHERE id = ?`, [estado, id]);
        return Number(res.affectedRows) > 0;
    }
}
exports.PricingRepository = PricingRepository;
