import app from "./app";
import { env } from "./config/env";
import { pool, startDbKeepAlive, stopDbKeepAlive, waitForDb } from "./config/db";

async function main() {
  await waitForDb();

  const server = app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Servidor corriendo en http://localhost:${env.PORT}`);
  });
  startDbKeepAlive();
  server.keepAliveTimeout = 15_000;
  server.headersTimeout = 20_000;
  server.requestTimeout = 30_000;
  server.maxRequestsPerSocket = 100;

  let shuttingDown = false;
  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    // eslint-disable-next-line no-console
    console.log(`[shutdown] ${signal}`);
    await new Promise((resolve) => server.close(() => resolve(null)));
    stopDbKeepAlive();
    await pool.end();
    process.exit(0);
  }

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    // eslint-disable-next-line no-console
    console.error("unhandledRejection", reason);
  });

  process.on("uncaughtException", (err) => {
    // eslint-disable-next-line no-console
    console.error("uncaughtException", err);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[startup] error:", err);
  process.exit(1);
});
