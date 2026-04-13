"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const db_1 = require("./config/db");
async function main() {
    await (0, db_1.pingDb)();
    const server = app_1.default.listen(env_1.env.PORT, () => {
        // eslint-disable-next-line no-console
        console.log(`Servidor corriendo en http://localhost:${env_1.env.PORT}`);
    });
    server.keepAliveTimeout = 15000;
    server.headersTimeout = 20000;
    server.requestTimeout = 30000;
    server.maxRequestsPerSocket = 100;
    let shuttingDown = false;
    async function shutdown(signal) {
        if (shuttingDown)
            return;
        shuttingDown = true;
        // eslint-disable-next-line no-console
        console.log(`[shutdown] ${signal}`);
        await new Promise((resolve) => server.close(() => resolve(null)));
        await db_1.pool.end();
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
