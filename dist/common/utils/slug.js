"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeSlug = sanitizeSlug;
exports.slugFromTitle = slugFromTitle;
function sanitizeSlug(input) {
    const raw = String(input || "").trim().toLowerCase();
    const normalized = raw.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    const cleaned = normalized
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    return cleaned.slice(0, 180);
}
function slugFromTitle(title) {
    const slug = sanitizeSlug(title);
    return slug || "curso";
}
