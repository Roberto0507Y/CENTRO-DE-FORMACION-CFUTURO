"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeFilename = sanitizeFilename;
exports.buildPublicUrl = buildPublicUrl;
exports.extractKeyFromPublicUrl = extractKeyFromPublicUrl;
const path_1 = __importDefault(require("path"));
function sanitizeFilename(filename) {
    const base = path_1.default.basename(filename || "file");
    const normalized = base.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    return normalized
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^\.+/, "")
        .slice(0, 120) || "file";
}
function buildPublicUrl(baseUrl, key) {
    const trimmed = baseUrl.replace(/\/+$/, "");
    return `${trimmed}/${key}`;
}
function extractKeyFromPublicUrl(baseUrl, url) {
    const trimmed = baseUrl.replace(/\/+$/, "");
    if (!url.startsWith(`${trimmed}/`))
        return null;
    const key = url.slice(trimmed.length + 1);
    return key || null;
}
