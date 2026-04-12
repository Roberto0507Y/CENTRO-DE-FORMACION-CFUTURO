"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractHttpUrlFromText = extractHttpUrlFromText;
exports.normalizePaymentLinkValue = normalizePaymentLinkValue;
const HTTP_URL_REGEX = /https?:\/\/[^\s"'<>]+/i;
function parseHttpUrl(raw) {
    try {
        const url = new URL(raw.trim());
        if (url.protocol !== "http:" && url.protocol !== "https:")
            return null;
        return url.toString();
    }
    catch {
        return null;
    }
}
function decodeCandidates(raw) {
    const attempts = [raw];
    let current = raw;
    for (let i = 0; i < 2; i += 1) {
        try {
            const decoded = decodeURIComponent(current);
            if (!decoded || decoded === current)
                break;
            attempts.push(decoded);
            current = decoded;
        }
        catch {
            break;
        }
    }
    return attempts;
}
function extractHttpUrlFromText(raw) {
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    for (const attempt of decodeCandidates(trimmed)) {
        const direct = parseHttpUrl(attempt);
        if (direct)
            return direct;
        const srcMatch = attempt.match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
        if (srcMatch) {
            const parsedSrc = parseHttpUrl(srcMatch);
            if (parsedSrc)
                return parsedSrc;
        }
        const inlineUrl = attempt.match(HTTP_URL_REGEX)?.[0];
        if (inlineUrl) {
            const parsedInline = parseHttpUrl(inlineUrl);
            if (parsedInline)
                return parsedInline;
        }
    }
    return null;
}
function normalizePaymentLinkValue(value) {
    if (value === undefined || value === null)
        return value;
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    if (!trimmed)
        return null;
    return extractHttpUrlFromText(trimmed) ?? trimmed;
}
