import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const numberFromEnv = (name: string) =>
  z.preprocess((v) => {
    if (typeof v !== "string") return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  }, z.number({ message: `${name} debe ser un número` }));

const optionalStringFromEnv = (name: string) =>
  z.preprocess((v) => {
    if (typeof v !== "string") return v;
    const trimmed = v.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().min(1, `${name} es requerido`).optional());

const optionalNumberFromEnv = (name: string) =>
  z.preprocess((v) => {
    if (v === undefined || v === null) return undefined;
    if (typeof v !== "string") return v;
    const trimmed = v.trim();
    if (trimmed.length === 0) return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : v;
  }, z.number({ message: `${name} debe ser un número` }).optional());

const envSchema = z.object({
  PORT: numberFromEnv("PORT"),

  DB_HOST: z.string().min(1, "DB_HOST es requerido"),
  DB_PORT: numberFromEnv("DB_PORT"),
  DB_USER: z.string().min(1, "DB_USER es requerido"),
  DB_PASSWORD: z.string().min(1, "DB_PASSWORD es requerido"),
  DB_NAME: z.string().min(1, "DB_NAME es requerido"),

  JWT_SECRET: z.string().min(20, "JWT_SECRET debe tener al menos 20 caracteres"),
  JWT_EXPIRES_IN: z.string().min(1, "JWT_EXPIRES_IN es requerido"),

  // AWS S3 (opcionales: el servidor puede iniciar sin S3, pero los endpoints de upload lo requieren)
  AWS_REGION: optionalStringFromEnv("AWS_REGION"),
  AWS_ACCESS_KEY_ID: optionalStringFromEnv("AWS_ACCESS_KEY_ID"),
  AWS_SECRET_ACCESS_KEY: optionalStringFromEnv("AWS_SECRET_ACCESS_KEY"),
  AWS_S3_BUCKET: optionalStringFromEnv("AWS_S3_BUCKET"),
  // Alias compatible (algunos entornos lo usan así)
  AWS_BUCKET_NAME: optionalStringFromEnv("AWS_BUCKET_NAME"),
  AWS_S3_BASE_URL: optionalStringFromEnv("AWS_S3_BASE_URL"),
  // Alias opcional para base URL pública (CloudFront o dominio propio)
  AWS_S3_PUBLIC_BASE_URL: optionalStringFromEnv("AWS_S3_PUBLIC_BASE_URL"),

  // SMTP (opcionales: el servidor puede iniciar sin SMTP, pero recuperación de contraseña lo requiere)
  SMTP_HOST: optionalStringFromEnv("SMTP_HOST"),
  SMTP_PORT: optionalNumberFromEnv("SMTP_PORT"),
  SMTP_USER: optionalStringFromEnv("SMTP_USER"),
  SMTP_PASSWORD: optionalStringFromEnv("SMTP_PASSWORD"),
  SMTP_FROM: optionalStringFromEnv("SMTP_FROM"),
  FRONTEND_URL: z.preprocess((v) => {
    if (typeof v !== "string") return v;
    const trimmed = v.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().url("FRONTEND_URL debe ser una URL válida").optional()),
  CORS_ORIGINS: optionalStringFromEnv("CORS_ORIGINS"),

  NODE_ENV: z
    .enum(["development", "test", "production"])
    .optional()
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

function formatEnvError(err: z.ZodError): string {
  const issues = err.issues
    .map((i) => {
      const key = i.path.join(".") || "env";
      return `- ${key}: ${i.message}`;
    })
    .join("\n");
  return `[env] Variables de entorno inválidas:\n${issues}\n\nTip: revisa \".env\" (o usa \".env.example\" como base).`;
}

export const env: Env = (() => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(formatEnvError(parsed.error));
  }

  // Normalizaciones / aliases (sin romper compatibilidad)
  const data = { ...parsed.data };
  if (!data.AWS_S3_BUCKET && data.AWS_BUCKET_NAME) data.AWS_S3_BUCKET = data.AWS_BUCKET_NAME;
  if (!data.AWS_S3_BASE_URL && data.AWS_S3_PUBLIC_BASE_URL) data.AWS_S3_BASE_URL = data.AWS_S3_PUBLIC_BASE_URL;

  return data;
})();
