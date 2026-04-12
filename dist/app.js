"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = __importDefault(require("./routes"));
const env_1 = require("./config/env");
const error_middleware_1 = require("./middlewares/error.middleware");
const app = (0, express_1.default)();
app.disable("x-powered-by");
const parseOrigin = (raw) => {
    try {
        return new URL(raw).origin;
    }
    catch {
        return null;
    }
};
const corsAllowedOrigins = (() => {
    const set = new Set();
    const frontOrigin = env_1.env.FRONTEND_URL ? parseOrigin(env_1.env.FRONTEND_URL) : null;
    if (frontOrigin)
        set.add(frontOrigin);
    const fromEnv = env_1.env.CORS_ORIGINS
        ? env_1.env.CORS_ORIGINS.split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : [];
    for (const entry of fromEnv) {
        const origin = parseOrigin(entry);
        if (origin)
            set.add(origin);
    }
    return set;
})();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (corsAllowedOrigins.size === 0) {
            return callback(null, env_1.env.NODE_ENV !== "production");
        }
        return callback(null, corsAllowedOrigins.has(origin));
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
}));
app.use((0, morgan_1.default)(env_1.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express_1.default.json({ limit: "1mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get("/api/health", (_req, res) => res.status(200).json({ ok: true }));
app.use("/api", routes_1.default);
app.use((_req, res) => {
    res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Ruta no encontrada" },
    });
});
app.use(error_middleware_1.errorMiddleware);
exports.default = app;
