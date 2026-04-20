import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { forbidden, unauthorized } from "../common/errors/httpErrors";
import type { AuthTokenPayload } from "../common/types/auth";
import type { AuthContext } from "../common/types/express";
import { readCookieValue } from "../common/utils/cookies";
import { AuthRepository } from "../modules/auth/auth.repository";
import { AUTH_COOKIE_NAME } from "../modules/auth/auth-session";
import { buildPasswordTokenVersion } from "../modules/auth/auth-token-version";
import { getCachedSessionState, setCachedSessionState } from "../modules/auth/session-state-cache";

const payloadSchema: z.ZodType<AuthTokenPayload> = z.object({
  sub: z.string().min(1),
  role: z.enum(["admin", "docente", "estudiante"]),
  pwdv: z.string().min(1),
});

const authRepo = new AuthRepository();

function wantsExplicitBearerTransport(authTransport?: string): boolean {
  const requestedTransport = String(authTransport || "").trim().toLowerCase();
  return requestedTransport === "bearer" || requestedTransport === "cookie+bearer";
}

function extractAuthToken(headers: {
  authorization?: string;
  cookie?: string;
  authTransport?: string;
}): string | null {
  const cookieToken = readCookieValue(headers.cookie, AUTH_COOKIE_NAME);
  if (cookieToken) {
    return cookieToken;
  }

  if (wantsExplicitBearerTransport(headers.authTransport) && headers.authorization) {
    if (!headers.authorization.startsWith("Bearer ")) {
      throw unauthorized("Token Bearer requerido");
    }
    return headers.authorization.slice("Bearer ".length).trim() || null;
  }

  return null;
}

export async function resolveAuthContext(headers: {
  authorization?: string;
  cookie?: string;
  authTransport?: string;
}): Promise<AuthContext> {
  const token = extractAuthToken(headers);
  if (!token) {
    throw unauthorized("Token Bearer requerido");
  }
  let userId: number;
  let payload: AuthTokenPayload;
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] });
    payload = payloadSchema.parse(decoded);
    userId = Number(payload.sub);
  } catch {
    throw unauthorized("Token inválido o expirado");
  }

  if (!Number.isFinite(userId)) {
    throw unauthorized("Token inválido");
  }

  const cachedUser = getCachedSessionState(userId);
  const user = cachedUser ?? (await authRepo.findSessionStateById(userId));
  if (!user) {
    throw unauthorized("Usuario no encontrado");
  }
  if (!cachedUser) setCachedSessionState(user);

  if (user.estado !== "activo") {
    throw forbidden("Tu usuario no está activo");
  }

  if (buildPasswordTokenVersion(user.password) !== payload.pwdv) {
    throw unauthorized("Token inválido o expirado");
  }

  return { userId: user.id, role: user.rol };
}
