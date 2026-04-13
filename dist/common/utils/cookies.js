"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readCookieValue = readCookieValue;
function readCookieValue(cookieHeader, name) {
    if (!cookieHeader)
        return null;
    for (const chunk of cookieHeader.split(";")) {
        const [rawName, ...rawValue] = chunk.split("=");
        if (rawName?.trim() !== name)
            continue;
        const joinedValue = rawValue.join("=").trim();
        if (!joinedValue)
            return null;
        try {
            return decodeURIComponent(joinedValue);
        }
        catch {
            return joinedValue;
        }
    }
    return null;
}
