import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../common/errors/AppError";

type MysqlError = Error & { code?: string };
type MulterLikeError = Error & { name?: string; code?: string };

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Datos inválidos",
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      ok: false,
      error: { code: err.code, message: err.message, details: err.details },
    });
    return;
  }

  const mysqlErr = err as MysqlError;
  if (mysqlErr?.code === "ER_DUP_ENTRY") {
    res.status(409).json({
      ok: false,
      error: { code: "DUPLICATE", message: "Registro duplicado" },
    });
    return;
  }

  const multerErr = err as MulterLikeError;
  if (multerErr?.name === "MulterError") {
    res.status(400).json({
      ok: false,
      error: { code: "UPLOAD_ERROR", message: "Error en subida de archivo" },
    });
    return;
  }

  // Error inesperado
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({
    ok: false,
    error: { code: "INTERNAL_SERVER_ERROR", message: "Error interno" },
  });
}
