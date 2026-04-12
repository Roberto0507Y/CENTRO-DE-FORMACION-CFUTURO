import type { NextFunction, Response } from "express";
import type { AuthedRequest } from "../common/types/express";
import { unauthorized } from "../common/errors/httpErrors";
import { resolveAuthContextFromBearer } from "./authToken";

export function optionalAuthMiddleware(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header) return next();
  if (!header.startsWith("Bearer ")) return next(unauthorized("Token Bearer requerido"));

  void resolveAuthContextFromBearer(header)
    .then((auth) => {
      req.auth = auth;
      next();
    })
    .catch((err) => next(err));
}
