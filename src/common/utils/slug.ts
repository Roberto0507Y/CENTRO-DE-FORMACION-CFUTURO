export function sanitizeSlug(input: string): string {
  const raw = String(input || "").trim().toLowerCase();
  const normalized = raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

  const cleaned = normalized
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned.slice(0, 180);
}

export function slugFromTitle(title: string): string {
  const slug = sanitizeSlug(title);
  return slug || "curso";
}

