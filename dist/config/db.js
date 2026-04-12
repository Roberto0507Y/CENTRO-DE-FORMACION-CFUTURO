"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.pingDb = pingDb;
exports.withTransaction = withTransaction;
const promise_1 = __importDefault(require("mysql2/promise"));
const env_1 = require("./env");
exports.pool = promise_1.default.createPool({
    host: env_1.env.DB_HOST,
    port: env_1.env.DB_PORT,
    user: env_1.env.DB_USER,
    password: env_1.env.DB_PASSWORD,
    database: env_1.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false,
    timezone: "Z",
    decimalNumbers: true,
    dateStrings: true,
});
async function pingDb() {
    const conn = await exports.pool.getConnection();
    try {
        await conn.ping();
    }
    finally {
        conn.release();
    }
}
async function withTransaction(fn) {
    const conn = await exports.pool.getConnection();
    try {
        await conn.beginTransaction();
        const result = await fn(conn);
        await conn.commit();
        return result;
    }
    catch (err) {
        try {
            await conn.rollback();
        }
        catch {
            // ignore rollback errors
        }
        throw err;
    }
    finally {
        conn.release();
    }
}
