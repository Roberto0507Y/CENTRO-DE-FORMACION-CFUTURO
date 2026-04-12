"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const toNumber = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};
const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";
exports.config = {
    port: toNumber(process.env.PORT, 3000),
    jwtSecret: process.env.JWT_SECRET || (isProd ? "" : "dev_secret"),
    isProd,
};
if (exports.config.isProd && (!exports.config.jwtSecret || exports.config.jwtSecret === "dev_secret")) {
    throw new Error("[config] JWT_SECRET requerido en produccion.");
}
