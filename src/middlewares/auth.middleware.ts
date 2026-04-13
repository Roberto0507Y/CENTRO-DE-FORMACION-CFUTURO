import type { NextFunction, Response } from "express";
import type { AuthedRequest } from "../common/types/express";
import { resolveAuthContext } from "./authToken";

export function authMiddleware(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): void {
  void resolveAuthContext({
    authorization: req.headers.authorization,
    cookie: req.headers.cookie,
    authTransport: typeof req.headers["x-auth-transport"] === "string" ? req.headers["x-auth-transport"] : undefined,
  })
    .then((auth) => {
      req.auth = auth;
      next();
    })
    .catch((err) => next(err));
}
