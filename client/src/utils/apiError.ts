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

type ValidationDetails = {
  formErrors?: unknown;
  fieldErrors?: unknown;
};

const FIELD_LABELS: Record<string, string> = {
  categoria_id: "categoría",
  docente_id: "docente",
  titulo: "título",
  slug: "slug",
  descripcion_corta: "descripción corta",
  descripcion: "descripción",
  imagen_url: "imagen",
  video_intro_url: "video de introducción",
  payment_link: "enlace de pago",
  tipo_acceso: "tipo de acceso",
  precio: "precio",
  nivel: "nivel",
  estado: "estado",
  duracion_horas: "duración",
  requisitos: "requisitos",
  objetivos: "objetivos",
  fecha_publicacion: "fecha de publicación",
};

function humanizeFieldName(field: string) {
  return FIELD_LABELS[field] ?? field.replaceAll("_", " ");
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function getValidationDetailsMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;

  const { formErrors, fieldErrors } = details as ValidationDetails;
  const globalErrors = toStringList(formErrors);
  if (globalErrors.length > 0) return globalErrors.join(" ");

  if (!fieldErrors || typeof fieldErrors !== "object") return null;

  const messages = Object.entries(fieldErrors as Record<string, unknown>)
    .map(([field, value]) => {
      const fieldMessages = toStringList(value);
      if (fieldMessages.length === 0) return null;
      return `${humanizeFieldName(field)}: ${fieldMessages.join(", ")}`;
    })
    .filter((message): message is string => Boolean(message));

  if (messages.length === 0) return null;
  return messages.join(" | ");
}

export function getApiErrorMessage(err: unknown, fallback = "Ocurrió un error") {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as unknown;
    if (isApiErrorResponse(data)) {
      const detailedMessage = getValidationDetailsMessage(data.error.details);
      return detailedMessage ?? data.error.message;
    }
    if (typeof err.message === "string" && err.message.trim().length > 0) return err.message;
  }
  if (err instanceof Error && err.message.trim().length > 0) return err.message;
  return fallback;
}
