import type { Response } from "express";
import { env } from "../../config/env";

export const AUTH_COOKIE_NAME = "cfuturo_session";

function resolveCookieMaxAgeMs(): number | undefined {
  const raw = String(env.JWT_EXPIRES_IN || "").trim();
  if (!raw) return undefined;

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric * 1000;
  }

  const match = raw.match(/^(\d+)\s*(ms|s|m|h|d)$/i);
  if (!match) return undefined;

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

export function setAuthSessionCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, buildCookieOptions());
}

export function clearAuthSessionCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, buildCookieOptions());
}
