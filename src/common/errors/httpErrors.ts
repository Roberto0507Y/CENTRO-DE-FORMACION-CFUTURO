import { AppError } from "./AppError";

export const badRequest = (message: string, details?: unknown) =>
  new AppError({ message, statusCode: 400, code: "BAD_REQUEST", details });

export const unauthorized = (message = "No autenticado") =>
  new AppError({ message, statusCode: 401, code: "UNAUTHORIZED" });

export const forbidden = (message = "No autorizado") =>
  new AppError({ message, statusCode: 403, code: "FORBIDDEN" });

export const notFound = (message = "No encontrado") =>
  new AppError({ message, statusCode: 404, code: "NOT_FOUND" });

export const conflict = (message: string) =>
  new AppError({ message, statusCode: 409, code: "CONFLICT" });

export const tooManyRequests = (message = "Demasiadas solicitudes. Intenta de nuevo más tarde.") =>
  new AppError({ message, statusCode: 429, code: "TOO_MANY_REQUESTS" });

export const serviceUnavailable = (message: string) =>
  new AppError({ message, statusCode: 503, code: "SERVICE_UNAVAILABLE" });
