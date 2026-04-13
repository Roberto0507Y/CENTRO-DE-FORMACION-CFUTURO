import mysql from "mysql2/promise";
import { env } from "./env";

const defaultConnectionLimit = env.NODE_ENV === "production" ? 5 : 10;
const connectionLimit = Math.max(1, env.DB_POOL_LIMIT ?? defaultConnectionLimit);
const maxIdle = Math.min(connectionLimit, Math.max(1, env.DB_POOL_MAX_IDLE ?? Math.min(3, connectionLimit)));
const idleTimeout = Math.max(10_000, env.DB_POOL_IDLE_MS ?? 60_000);
const queueLimit = Math.max(0, env.DB_POOL_QUEUE_LIMIT ?? 50);

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit,
  maxIdle,
  idleTimeout,
  queueLimit,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  namedPlaceholders: false,
  timezone: "Z",
  decimalNumbers: true,
  dateStrings: true,
});

export async function pingDb(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}

export async function withTransaction<T>(
  fn: (conn: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    try {
      await conn.rollback();
    } catch {
      // ignore rollback errors
    }
    throw err;
  } finally {
    conn.release();
  }
}
