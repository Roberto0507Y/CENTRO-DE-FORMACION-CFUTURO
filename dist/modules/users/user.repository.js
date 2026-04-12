"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const db_1 = require("../../config/db");
class UserRepository {
    buildListWhere(params) {
        const where = [];
        const values = [];
        if (params.search) {
            const like = `%${params.search}%`;
            where.push(`(CONCAT_WS(' ', nombres, apellidos) LIKE ?
          OR correo LIKE ?
          OR CAST(id AS CHAR) LIKE ?
          OR rol LIKE ?
          OR estado LIKE ?)`);
            values.push(like, like, like, like, like);
        }
        return {
            whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
            values,
        };
    }
    async findById(id) {
        const [rows] = await db_1.pool.query(`SELECT
        id, nombres, apellidos, correo, telefono, foto_url, fecha_nacimiento, direccion,
        rol, estado, ultimo_login, created_at, updated_at
       FROM usuarios
       WHERE id = ?
       LIMIT 1`, [id]);
        return rows[0] ?? null;
    }
    async list(params) {
        const { whereSql, values } = this.buildListWhere(params);
        const [countRows] = await db_1.pool.query(`SELECT COUNT(*) as total
       FROM usuarios
       ${whereSql}`, values);
        const total = countRows[0]?.total ?? 0;
        const [rows] = await db_1.pool.query(`SELECT
        id, nombres, apellidos, correo, telefono, foto_url, fecha_nacimiento, direccion,
        rol, estado, ultimo_login, created_at, updated_at
       FROM usuarios
       ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`, [...values, params.limit, params.offset]);
        return { items: rows, total };
    }
    async updateById(id, input) {
        const fields = [];
        const values = [];
        const set = (key, column) => {
            const value = input[key];
            if (value === undefined)
                return;
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
        if (fields.length === 0)
            return;
        values.push(id);
        await db_1.pool.execute(`UPDATE usuarios
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, values);
    }
    async deleteById(id) {
        const [res] = await db_1.pool.execute("DELETE FROM usuarios WHERE id = ? LIMIT 1", [
            id,
        ]);
        return res.affectedRows;
    }
}
exports.UserRepository = UserRepository;
