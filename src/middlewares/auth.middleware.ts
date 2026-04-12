import type { NextFunction, Response } from "express";
import type { AuthedRequest } from "../common/types/express";
import { resolveAuthContextFromBearer } from "./authToken";

export function authMiddleware(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): void {
  void resolveAuthContextFromBearer(req.headers.authorization)
    .then((auth) => {
      req.auth = auth;
      next();
    })
    .catch((err) => next(err));
}
