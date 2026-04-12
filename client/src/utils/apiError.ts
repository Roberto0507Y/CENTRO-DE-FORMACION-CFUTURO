import axios from "axios";
import type { ApiErrorResponse } from "../types/api";

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as { ok?: unknown; error?: unknown };
  if (v.ok !== false) return false;
  if (!v.error || typeof v.error !== "object") return false;
  const e = v.error as { message?: unknown };
  return typeof e.message === "string";
}

export function getApiErrorMessage(err: unknown, fallback = "Ocurrió un error") {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as unknown;
    if (isApiErrorResponse(data)) return data.error.message;
    if (typeof err.message === "string" && err.message.trim().length > 0) return err.message;
  }
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  return fallback;
}

