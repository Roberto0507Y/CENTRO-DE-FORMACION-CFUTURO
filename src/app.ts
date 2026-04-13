import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { env } from "./config/env";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();
const isProduction = env.NODE_ENV === "production";
app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);
app.disable("x-powered-by");

const DEFAULT_DEV_CORS_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];
const DEFAULT_CORS_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"];
const CSP_FRAME_SOURCES = [
  "https://pay.ebi.com.gt",
  "https://link.ebi.com.gt",
  "https://www.youtube.com",
  "https://player.vimeo.com",
];
const CSP_SCRIPT_SOURCES =
  env.NODE_ENV === "production" ? ["'self'"] : ["'self'", "'unsafe-eval'"];
const CSP_STYLE_SOURCES = ["'self'", "'unsafe-inline'"];

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
  const invalidEntries: string[] = [];
  for (const entry of fromEnv) {
    const origin = parseOrigin(entry);
    if (origin) {
      set.add(origin);
    } else {
      invalidEntries.push(entry);
    }
  }

  if (invalidEntries.length > 0) {
    throw new Error(`[cors] CORS_ORIGINS contiene URLs inválidas: ${invalidEntries.join(", ")}`);
  }

  if (env.NODE_ENV !== "production") {
    for (const origin of DEFAULT_DEV_CORS_ORIGINS) {
      set.add(origin);
    }
  }

  return set;
})();

const frontOrigin = env.FRONTEND_URL ? parseOrigin(env.FRONTEND_URL) : null;
const devConnectSources =
  env.NODE_ENV === "production"
    ? []
    : ["http://localhost:5173", "http://127.0.0.1:5173", "ws://localhost:5173", "ws://127.0.0.1:5173"];
const cspConnectSources = Array.from(
  new Set(["'self'", ...(frontOrigin ? [frontOrigin] : []), ...Array.from(corsAllowedOrigins), ...devConnectSources])
);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        formAction: ["'self'"],
        manifestSrc: ["'self'"],
        scriptSrc: CSP_SCRIPT_SOURCES,
        scriptSrcAttr: ["'none'"],
        styleSrc: CSP_STYLE_SOURCES,
        styleSrcElem: CSP_STYLE_SOURCES,
        styleSrcAttr: ["'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: cspConnectSources,
        frameSrc: ["'self'", ...CSP_FRAME_SOURCES],
        mediaSrc: ["'self'", "blob:", "data:", "https:"],
        workerSrc: ["'self'", "blob:"],
        upgradeInsecureRequests: env.NODE_ENV === "production" ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "same-site" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts:
      env.NODE_ENV === "production"
        ? {
            maxAge: 60 * 60 * 24 * 180,
            includeSubDomains: true,
            preload: false,
          }
        : false,
  }),
);
app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), microphone=(), payment=(), usb=(), browsing-topics=()",
  );
  next();
});
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalizedOrigin = parseOrigin(origin);
      if (!normalizedOrigin) return callback(null, false);
      return callback(null, corsAllowedOrigins.has(normalizedOrigin));
    },
    credentials: true,
    methods: DEFAULT_CORS_METHODS,
    maxAge: env.NODE_ENV === "production" ? 60 * 60 * 24 : 60 * 10,
    optionsSuccessStatus: 204,
    exposedHeaders: ["Content-Disposition"],
  })
);

app.use(
  morgan(isProduction ? "tiny" : "dev", {
    skip: (req) => req.path === "/api/health",
  })
);
app.use(express.json({ limit: isProduction ? "512kb" : "1mb" }));
app.use(express.urlencoded({ extended: false, limit: isProduction ? "256kb" : "512kb" }));

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
