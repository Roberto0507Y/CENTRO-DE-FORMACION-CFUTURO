import type { NextFunction, Response } from "express";
import type { AuthedRequest } from "../common/types/express";
import { unauthorized } from "../common/errors/httpErrors";
import { resolveAuthContext } from "./authToken";

function wantsExplicitBearerTransport(authTransport?: string): boolean {
  const requestedTransport = String(authTransport || "").trim().toLowerCase();
  return requestedTransport === "bearer" || requestedTransport === "cookie+bearer";
}

export function optionalAuthMiddleware(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  const cookie = req.headers.cookie;
  const authTransport = typeof req.headers["x-auth-transport"] === "string" ? req.headers["x-auth-transport"] : undefined;
  if (!header && !cookie) return next();
  if (header && !header.startsWith("Bearer ")) return next(unauthorized("Token Bearer requerido"));
  if (header && !wantsExplicitBearerTransport(authTransport)) {
    return next(unauthorized("X-Auth-Transport: bearer requerido"));
  }

  void resolveAuthContext({
    authorization: header,
    cookie,
    authTransport,
  })
    .then((auth) => {
      req.auth = auth;
      next();
    })
    .catch((err) => next(err));
}
