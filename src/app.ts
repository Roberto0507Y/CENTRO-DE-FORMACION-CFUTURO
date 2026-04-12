import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { env } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();
app.disable("x-powered-by");

const parseOrigin = (raw: string): string | null => {
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
};

const corsAllowedOrigins = (() => {
  const set = new Set<string>();
  const frontOrigin = env.FRONTEND_URL ? parseOrigin(env.FRONTEND_URL) : null;
  if (frontOrigin) set.add(frontOrigin);

  const fromEnv = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
  for (const entry of fromEnv) {
    const origin = parseOrigin(entry);
    if (origin) set.add(origin);
  }

  return set;
})();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsAllowedOrigins.size === 0) {
        return callback(null, env.NODE_ENV !== "production");
      }
      return callback(null, corsAllowedOrigins.has(origin));
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);

app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => res.status(200).json({ ok: true }));
app.use("/api", routes);

app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    error: { code: "NOT_FOUND", message: "Ruta no encontrada" },
  });
});

app.use(errorMiddleware);

export default app;
