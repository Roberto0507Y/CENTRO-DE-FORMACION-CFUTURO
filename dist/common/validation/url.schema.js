"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nullableHttpUrlFromBody = nullableHttpUrlFromBody;
exports.nullableAppFileUrlFromBody = nullableAppFileUrlFromBody;
const zod_1 = require("zod");
function nullableHttpUrlFromBody(fieldName, max = 500) {
    return zod_1.z.preprocess((v) => {
        if (v === null || v === undefined)
            return v;
        if (typeof v !== "string")
            return v;
        const t = v.trim();
        return t.length === 0 ? null : t;
    }, zod_1.z.string()
        .url(`${fieldName} inválido`)
        .max(max)
        .refine((value) => {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
    }, `${fieldName} debe usar http o https`)
        .nullable());
}
function nullableAppFileUrlFromBody(fieldName, max = 255) {
    return zod_1.z.preprocess((v) => {
        if (v === null || v === undefined)
            return v;
        if (typeof v !== "string")
            return v;
        const t = v.trim();
        return t.length === 0 ? null : t;
    }, zod_1.z.string()
        .max(max)
        .refine((value) => {
        if (value.startsWith("/api/files/download/"))
            return true;
        try {
            const protocol = new URL(value).protocol;
            return protocol === "http:" || protocol === "https:";
        }
        catch {
            return false;
        }
    }, `${fieldName} debe usar http o https`)
        .nullable());
}
