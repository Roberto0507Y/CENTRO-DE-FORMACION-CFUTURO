import mysql from "mysql2/promise";
import { env } from "./env";

const defaultConnectionLimit = env.NODE_ENV === "production" ? 5 : 10;
const connectionLimit = Math.max(1, env.DB_POOL_LIMIT ?? defaultConnectionLimit);
const defaultMaxIdle = env.NODE_ENV === "production" ? Math.min(2, connectionLimit) : Math.min(3, connectionLimit);
const maxIdle = Math.min(connectionLimit, Math.max(1, env.DB_POOL_MAX_IDLE ?? defaultMaxIdle));
const defaultIdleTimeout = env.NODE_ENV === "production" ? 5 * 60_000 : 60_000;
const idleTimeout = Math.max(10_000, env.DB_POOL_IDLE_MS ?? defaultIdleTimeout);
const queueLimit = Math.max(0, env.DB_POOL_QUEUE_LIMIT ?? 50);
const connectTimeout = Math.max(5_000, env.DB_CONNECT_TIMEOUT_MS ?? 10_000);
const keepAliveMs = Math.max(0, env.DB_KEEPALIVE_MS ?? 0);
const startupRetries = Math.max(0, env.DB_STARTUP_RETRIES ?? (env.NODE_ENV === "production" ? 3 : 1));
const startupRetryMs = Math.max(500, env.DB_STARTUP_RETRY_MS ?? 1_500);
const dbSessionTimeZone = "-06:00";

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
  connectTimeout,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  namedPlaceholders: false,
  timezone: dbSessionTimeZone,
  decimalNumbers: true,
  dateStrings: true,
  multipleStatements: false,
});

let keepAliveTimer: NodeJS.Timeout | null = null;
let queueWarningLastLoggedAt = 0;

function getDbErrorSummary(err: unknown): string {
  if (!err || typeof err !== "object") return "unknown";
  const e = err as { code?: string; errno?: number; sqlState?: string; message?: string };
  return [
    e.code ? `code=${e.code}` : null,
    e.errno ? `errno=${e.errno}` : null,
    e.sqlState ? `sqlState=${e.sqlState}` : null,
    e.message ? `message=${e.message}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

pool.on("connection", (conn) => {
  const rawConn = conn as unknown as {
    query: (sql: string, values: unknown[], cb: (err: unknown) => void) => void;
  };

  rawConn.query("SET time_zone = ?", [dbSessionTimeZone], (err) => {
    if (!err) return;
    // eslint-disable-next-line no-console
    console.warn(`[db] No se pudo configurar time_zone ${dbSessionTimeZone}: ${getDbErrorSummary(err)}`);
  });
});

pool.on("enqueue", () => {
  const now = Date.now();
  if (now - queueWarningLastLoggedAt < 60_000) return;
  queueWarningLastLoggedAt = now;
  // eslint-disable-next-line no-console
  console.warn("[db] Pool MySQL en cola: revisa consultas lentas o aumenta DB_POOL_LIMIT con cuidado.");
});

export async function pingDb(): Promise<void> {
  let conn: mysql.PoolConnection | null = null;
  let healthy = false;
  try {
    conn = await pool.getConnection();
    await conn.ping();
    healthy = true;
  } finally {
    if (conn) {
      if (healthy) conn.release();
      else conn.destroy();
    }
  }
}

export async function waitForDb(): Promise<void> {
  let attempt = 0;
  while (true) {
    try {
      await pingDb();
      return;
    } catch (err) {
      if (attempt >= startupRetries) throw err;
      attempt += 1;
      const delay = Math.min(startupRetryMs * attempt, 10_000);
      // eslint-disable-next-line no-console
      console.warn(
        `[db] Conexión no disponible, reintentando ${attempt}/${startupRetries} en ${delay}ms: ${getDbErrorSummary(err)}`
      );
      await sleep(delay);
    }
  }
}

export function startDbKeepAlive(): () => void {
  if (keepAliveMs <= 0 || keepAliveTimer) return stopDbKeepAlive;

  keepAliveTimer = setInterval(() => {
    void pingDb().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(`[db] Keepalive falló: ${getDbErrorSummary(err)}`);
    });
  }, keepAliveMs);
  keepAliveTimer.unref?.();

  return stopDbKeepAlive;
}

export function stopDbKeepAlive(): void {
  if (!keepAliveTimer) return;
  clearInterval(keepAliveTimer);
  keepAliveTimer = null;
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
