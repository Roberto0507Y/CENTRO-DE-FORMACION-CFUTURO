import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodSchema } from "zod";

type Schemas = Partial<{
  body: ZodSchema;
  params: ZodSchema;
  query: ZodSchema;
}>;

export function validate(schemas: Schemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.body) req.body = schemas.body.parse(req.body);
    if (schemas.params) {
      const parsed = schemas.params.parse(req.params) as unknown;
      Object.assign(req.params as Record<string, unknown>, parsed as Record<string, unknown>);
    }
    if (schemas.query) {
      const parsed = schemas.query.parse(req.query) as unknown;
      Object.assign(req.query as Record<string, unknown>, parsed as Record<string, unknown>);
    }
    next();
  };
}
