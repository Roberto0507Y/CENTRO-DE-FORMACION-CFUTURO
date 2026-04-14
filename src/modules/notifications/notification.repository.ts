import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../../config/db";
import type { Notification, NotificationType } from "./notification.types";

type NotificationRow = RowDataPacket & Notification;
type CountRow = RowDataPacket & { total: number };
type AdminIdRow = RowDataPacket & { id: number };

export class NotificationRepository {
  async listForUser(
    userId: number,
    q: { limit: number; offset: number; unread?: boolean }
  ): Promise<{ items: Notification[]; total: number; unreadCount: number }> {
    const limit = Math.max(1, Math.min(Number(q.limit) || 20, 50));
    const offset = Math.max(0, Number(q.offset) || 0);
    const where: string[] = ["n.usuario_id = ?"];
    const params: Array<number | string> = [userId];

    if (q.unread) {
      where.push("n.leida = 0");
    }

    const totalQuery = pool.query<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM notificaciones n
       WHERE ${where.join(" AND ")}`,
      params
    );
    const unreadQuery = q.unread
      ? null
      : pool.query<CountRow[]>(
          `SELECT COUNT(*) AS total
           FROM notificaciones n
           WHERE n.usuario_id = ? AND n.leida = 0`,
          [userId]
        );
    const itemsQuery = pool.query<NotificationRow[]>(
      `SELECT
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
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[countRows], unreadResult, [rows]] = await Promise.all([
      totalQuery,
      unreadQuery ?? Promise.resolve<[CountRow[], unknown]>([[{ total: 0 } as CountRow], undefined]),
      itemsQuery,
    ]);
    const total = Number(countRows[0]?.total ?? 0);

    let unreadCount = total;
    if (!q.unread) {
      const [unreadRows] = unreadResult;
      unreadCount = Number(unreadRows[0]?.total ?? 0);
    }

    return { items: rows, total, unreadCount };
  }

  async markRead(userId: number, id: number): Promise<boolean> {
    const [res] = await pool.execute<ResultSetHeader>(
      `UPDATE notificaciones
       SET leida = 1, fecha_lectura = NOW(), updated_at = NOW()
       WHERE id = ? AND usuario_id = ?
       LIMIT 1`,
      [id, userId]
    );
    return res.affectedRows > 0;
  }

  async markAllRead(userId: number): Promise<number> {
    const [res] = await pool.execute<ResultSetHeader>(
      `UPDATE notificaciones
       SET leida = 1, fecha_lectura = NOW(), updated_at = NOW()
       WHERE usuario_id = ? AND leida = 0`,
      [userId]
    );
    return Number(res.affectedRows);
  }

  async deleteForUser(userId: number, id: number): Promise<boolean> {
    const [res] = await pool.execute<ResultSetHeader>(
      `DELETE FROM notificaciones
       WHERE id = ? AND usuario_id = ?
       LIMIT 1`,
      [id, userId]
    );
    return res.affectedRows > 0;
  }

  async listActiveAdminIds(conn?: PoolConnection): Promise<number[]> {
    const executor = conn ?? pool;
    const [rows] = await executor.query<AdminIdRow[]>(
      `SELECT id FROM usuarios WHERE rol = 'admin' AND estado = 'activo'`
    );
    return rows.map((r) => Number(r.id));
  }

  async createMany(
    conn: PoolConnection,
    input: Array<{
      usuario_id: number;
      titulo: string;
      mensaje: string;
      tipo: NotificationType;
      referencia_tipo?: string | null;
      referencia_id?: number | null;
    }>
  ): Promise<void> {
    if (input.length === 0) return;
    const values: Array<string | number | null> = [];
    const tuples = input.map((n) => {
      values.push(
        n.usuario_id,
        n.titulo,
        n.mensaje,
        n.tipo,
        n.referencia_tipo ?? null,
        n.referencia_id ?? null
      );
      return "(?, ?, ?, ?, ?, ?)";
    });

    await conn.execute(
      `INSERT INTO notificaciones
        (usuario_id, titulo, mensaje, tipo, referencia_tipo, referencia_id)
       VALUES ${tuples.join(", ")}`,
      values
    );
  }
}
