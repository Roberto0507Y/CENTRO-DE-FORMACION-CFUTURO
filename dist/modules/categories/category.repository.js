"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryRepository = void 0;
const db_1 = require("../../config/db");
class CategoryRepository {
    async findByName(nombre) {
        const [rows] = await db_1.pool.query(`SELECT id, nombre, descripcion, imagen_url, estado, created_at, updated_at
       FROM categorias
       WHERE nombre = ?
       LIMIT 1`, [nombre]);
        return rows[0] ?? null;
    }
    async listActive() {
        const [rows] = await db_1.pool.query(`SELECT id, nombre, descripcion, imagen_url, estado, created_at, updated_at
       FROM categorias
       WHERE estado = 'activo'
       ORDER BY nombre ASC`);
        return rows;
    }
    async listAdmin(q) {
        const where = ["1=1"];
        const params = [];
        if (q.estado) {
            where.push("cat.estado = ?");
            params.push(q.estado);
        }
        if (q.q) {
            where.push("cat.nombre LIKE ?");
            params.push(`%${q.q}%`);
        }
        const [rows] = await db_1.pool.query(`SELECT
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
       ORDER BY cat.nombre ASC`, params);
        return rows.map((r) => ({ ...r, cursos_count: Number(r.cursos_count ?? 0) }));
    }
    async findActiveById(id) {
        const [rows] = await db_1.pool.query(`SELECT id, nombre, descripcion, imagen_url, estado, created_at, updated_at
       FROM categorias
       WHERE id = ? AND estado = 'activo'
       LIMIT 1`, [id]);
        return rows[0] ?? null;
    }
    async findById(id) {
        const [rows] = await db_1.pool.query(`SELECT id, nombre, descripcion, imagen_url, estado, created_at, updated_at
       FROM categorias
       WHERE id = ?
       LIMIT 1`, [id]);
        return rows[0] ?? null;
    }
    async findByIdWithCount(id) {
        const [rows] = await db_1.pool.query(`SELECT
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
       LIMIT 1`, [id]);
        const r = rows[0];
        if (!r)
            return null;
        return { ...r, cursos_count: Number(r.cursos_count ?? 0) };
    }
    async countCoursesByCategoryId(id) {
        const [rows] = await db_1.pool.query(`SELECT COUNT(*) AS total FROM cursos WHERE categoria_id = ?`, [id]);
        return Number(rows[0]?.total ?? 0);
    }
    async create(input) {
        const [result] = await db_1.pool.execute(`INSERT INTO categorias
        (nombre, descripcion, imagen_url, estado, created_at, updated_at)
       VALUES (?, ?, ?, 'activo', NOW(), NOW())`, [
            input.nombre,
            input.descripcion ?? null,
            input.imagen_url ?? null,
        ]);
        return result.insertId;
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
        set("nombre", "nombre");
        set("descripcion", "descripcion");
        set("imagen_url", "imagen_url");
        set("estado", "estado");
        if (fields.length === 0)
            return;
        values.push(id);
        await db_1.pool.execute(`UPDATE categorias
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, values);
    }
    async softDeleteById(id) {
        const [result] = await db_1.pool.execute(`UPDATE categorias
       SET estado = 'inactivo', updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, [id]);
        return result.affectedRows > 0;
    }
    async updateStatusById(id, estado) {
        const [result] = await db_1.pool.execute(`UPDATE categorias
       SET estado = ?, updated_at = NOW()
       WHERE id = ?
       LIMIT 1`, [estado, id]);
        return result.affectedRows > 0;
    }
}
exports.CategoryRepository = CategoryRepository;
