import type { NextFunction, Response } from "express";
import type { UserRole } from "../common/types/auth";
import type { AuthedRequest } from "../common/types/express";
import { forbidden, unauthorized } from "../common/errors/httpErrors";

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.role)) {
      return next(forbidden("No tienes permisos para esta acción"));
    }
    next();
  };
}

