"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
const httpErrors_1 = require("../common/errors/httpErrors");
function rateLimit(options) {
    const keyPrefix = options.keyPrefix ?? "global";
    const buckets = new Map();
    const cleanup = (now) => {
        for (const [key, bucket] of buckets) {
            if (bucket.resetAt <= now)
                buckets.delete(key);
        }
    };
    let lastCleanupAt = Date.now();
    return (req, _res, next) => {
        const now = Date.now();
        if (now - lastCleanupAt >= Math.max(options.windowMs, 60000)) {
            cleanup(now);
            lastCleanupAt = now;
        }
        const key = `${keyPrefix}:${req.ip}`;
        const current = buckets.get(key);
        if (!current || current.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + options.windowMs });
            next();
            return;
        }
        if (current.count >= options.max) {
            next((0, httpErrors_1.tooManyRequests)(options.message));
            return;
        }
        current.count += 1;
        buckets.set(key, current);
        next();
    };
}
