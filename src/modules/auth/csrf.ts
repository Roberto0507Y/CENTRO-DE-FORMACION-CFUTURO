import crypto from "crypto";
import type { Response } from "express";
import { env } from "../../config/env";
import { buildCsrfCookieOptions } from "./auth-cookie-policy";

export const CSRF_COOKIE_NAME = "cfuturo_csrf";
export const CSRF_HEADER_NAME = "x-csrf-token";

const csrfSecret = env.CSRF_SECRET || env.JWT_SECRET;

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
  res.cookie(CSRF_COOKIE_NAME, token, buildCsrfCookieOptions(env.NODE_ENV, env.JWT_EXPIRES_IN));
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  return token;
}

export function rotateCsrfToken(res: Response): string {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, buildCsrfCookieOptions(env.NODE_ENV, env.JWT_EXPIRES_IN));
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  return token;
}

export function clearCsrfToken(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, buildCsrfCookieOptions(env.NODE_ENV, env.JWT_EXPIRES_IN));
}
