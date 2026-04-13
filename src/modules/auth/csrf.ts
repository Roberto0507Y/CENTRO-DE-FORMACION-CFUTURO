import crypto from "crypto";
import type { Response } from "express";
import { env } from "../../config/env";

export const CSRF_COOKIE_NAME = "cfuturo_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

const DEFAULT_CSRF_TTL_MS = 12 * 60 * 60 * 1000;
const csrfSecret = env.CSRF_SECRET || env.JWT_SECRET;

function resolveCookieMaxAgeMs(): number {
  const raw = String(env.JWT_EXPIRES_IN || "").trim();
  if (!raw) return DEFAULT_CSRF_TTL_MS;

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric * 1000;
  }

  const match = raw.match(/^(\d+)\s*(ms|s|m|h|d)$/i);
  if (!match) return DEFAULT_CSRF_TTL_MS;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

function buildCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api",
    maxAge: resolveCookieMaxAgeMs(),
  };
}

function signNonce(nonce: string): string {
  return crypto.createHmac("sha256", csrfSecret).update(nonce).digest("base64url");
}

export function generateCsrfToken(): string {
  const nonce = crypto.randomBytes(32).toString("base64url");
  return `${nonce}.${signNonce(nonce)}`;
}

export function isValidCsrfToken(token: string): boolean {
  const [nonce, signature, ...rest] = token.split(".");
  if (!nonce || !signature || rest.length > 0) return false;

  const expectedSignature = signNonce(nonce);
  const receivedBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (receivedBuffer.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function issueCsrfToken(res: Response, currentToken?: string | null): string {
  const token = currentToken && isValidCsrfToken(currentToken) ? currentToken : generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, buildCookieOptions());
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  return token;
}

export function rotateCsrfToken(res: Response): string {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, buildCookieOptions());
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  return token;
}

export function clearCsrfToken(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, buildCookieOptions());
}
