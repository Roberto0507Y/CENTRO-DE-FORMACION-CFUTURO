import type { NextFunction, Request, Response } from "express";
import { forbidden } from "../common/errors/httpErrors";
import { readCookieValue } from "../common/utils/cookies";
import { AUTH_COOKIE_NAME } from "../modules/auth/auth-session";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, isValidCsrfToken } from "../modules/auth/csrf";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function readCsrfHeader(req: Request): string | null {
  const raw = req.headers[CSRF_HEADER_NAME];
  if (Array.isArray(raw)) return raw[0] || null;
  return typeof raw === "string" ? raw.trim() || null : null;
}

function isBearerApiRequest(req: Request): boolean {
  const requestedTransport = String(req.headers["x-auth-transport"] || "")
    .trim()
    .toLowerCase();
  return requestedTransport === "bearer" || requestedTransport === "cookie+bearer";
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next();
    return;
  }

  if (isBearerApiRequest(req)) {
    next();
    return;
  }

  const csrfCookie = readCookieValue(req.headers.cookie, CSRF_COOKIE_NAME);
  const csrfHeader = readCsrfHeader(req);

  if (!csrfCookie || !csrfHeader) {
    next(forbidden("Token CSRF inválido o ausente"));
    return;
  }

  if (csrfCookie !== csrfHeader || !isValidCsrfToken(csrfCookie)) {
    next(forbidden("Token CSRF inválido o ausente"));
    return;
  }

  next();
}
