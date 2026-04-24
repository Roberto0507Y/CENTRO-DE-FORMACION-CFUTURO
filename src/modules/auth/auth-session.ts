import type { Response } from "express";
import { env } from "../../config/env";
import { buildAuthCookieOptions } from "./auth-cookie-policy";

export const AUTH_COOKIE_NAME = "cfuturo_session";

export function setAuthSessionCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, buildAuthCookieOptions(env.NODE_ENV, env.JWT_EXPIRES_IN));
}

export function clearAuthSessionCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, buildAuthCookieOptions(env.NODE_ENV, env.JWT_EXPIRES_IN));
}
