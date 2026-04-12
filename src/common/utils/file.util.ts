import path from "path";

export function sanitizeFilename(filename: string): string {
  const base = path.basename(filename || "file");
  const normalized = base.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return normalized
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 120) || "file";
}

export function buildPublicUrl(baseUrl: string, key: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return `${trimmed}/${key}`;
}

export function extractKeyFromPublicUrl(baseUrl: string, url: string): string | null {
  const trimmed = baseUrl.replace(/\/+$/, "");
  if (!url.startsWith(`${trimmed}/`)) return null;
  const key = url.slice(trimmed.length + 1);
  return key || null;
}

