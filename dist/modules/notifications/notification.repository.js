"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepository = void 0;
const db_1 = require("../../config/db");
class NotificationRepository {
    async listForUser(userId, q) {
        const where = ["n.usuario_id = ?"];
        const params = [userId];
        if (q.unread) {
            where.push("n.leida = 0");
        }
        const [countRows] = await db_1.pool.query(`SELECT COUNT(*) AS total
       FROM notificaciones n
       WHERE ${where.join(" AND ")}`, params);
        const total = Number(countRows[0]?.total ?? 0);
        const [unreadRows] = await db_1.pool.query(`SELECT COUNT(*) AS total
       FROM notificaciones n
       WHERE n.usuario_id = ? AND n.leida = 0`, [userId]);
        const unreadCount = Number(unreadRows[0]?.total ?? 0);
        const [rows] = await db_1.pool.query(`SELECT
        n.id,
        n.usuario_id,
        n.titulo,
        n.mensaje,
        n.tipo,
        n.referencia_tipo,
        n.referencia_id,
        n.leida,
        n.fecha_lectura,
        n.created_at,
        n.updated_at
       FROM notificaciones n
       WHERE ${where.join(" AND ")}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`, [...params, q.limit, q.offset]);
        return { items: rows, total, unreadCount };
    }
    async markRead(userId, id) {
        const [res] = await db_1.pool.execute(`UPDATE notificaciones
       SET leida = 1, fecha_lectura = NOW(), updated_at = NOW()
       WHERE id = ? AND usuario_id = ?
       LIMIT 1`, [id, userId]);
        return res.affectedRows > 0;
    }
    async markAllRead(userId) {
        const [res] = await db_1.pool.execute(`UPDATE notificaciones
       SET leida = 1, fecha_lectura = NOW(), updated_at = NOW()
       WHERE usuario_id = ? AND leida = 0`, [userId]);
        return Number(res.affectedRows);
    }
    async deleteForUser(userId, id) {
        const [res] = await db_1.pool.execute(`DELETE FROM notificaciones
       WHERE id = ? AND usuario_id = ?
       LIMIT 1`, [id, userId]);
        return res.affectedRows > 0;
    }
    async listActiveAdminIds(conn) {
        const executor = conn ?? db_1.pool;
        const [rows] = await executor.query(`SELECT id FROM usuarios WHERE rol = 'admin' AND estado = 'activo'`);
        return rows.map((r) => Number(r.id));
    }
    async createMany(conn, input) {
        if (input.length === 0)
            return;
        const values = [];
        const tuples = input.map((n) => {
            values.push(n.usuario_id, n.titulo, n.mensaje, n.tipo, n.referencia_tipo ?? null, n.referencia_id ?? null);
            return "(?, ?, ?, ?, ?, ?)";
        });
        await conn.execute(`INSERT INTO notificaciones
        (usuario_id, titulo, mensaje, tipo, referencia_tipo, referencia_id)
       VALUES ${tuples.join(", ")}`, values);
    }
}
exports.NotificationRepository = NotificationRepository;
