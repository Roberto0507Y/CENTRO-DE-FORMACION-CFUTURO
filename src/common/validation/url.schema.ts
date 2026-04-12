import { z } from "zod";

export function nullableHttpUrlFromBody(fieldName: string, max = 500) {
  return z.preprocess((v) => {
    if (v === null || v === undefined) return v;
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t.length === 0 ? null : t;
  }, z.string()
    .url(`${fieldName} inválido`)
    .max(max)
    .refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    }, `${fieldName} debe usar http o https`)
    .nullable());
}

export function nullableAppFileUrlFromBody(fieldName: string, max = 255) {
  return z.preprocess((v) => {
    if (v === null || v === undefined) return v;
    if (typeof v !== "string") return v;
    const t = v.trim();
    return t.length === 0 ? null : t;
  }, z.string()
    .max(max)
    .refine((value) => {
      if (value.startsWith("/api/files/download/")) return true;
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, `${fieldName} debe usar http o https`)
    .nullable());
}
