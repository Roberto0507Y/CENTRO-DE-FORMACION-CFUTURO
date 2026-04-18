import type { NextFunction, Request, Response } from "express";
import { tooManyRequests } from "../common/errors/httpErrors";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
  message?: string;
  keyGenerator?: (req: Request) => string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export function rateLimit(options: RateLimitOptions) {
  const keyPrefix = options.keyPrefix ?? "global";
  const buckets = new Map<string, Bucket>();

  const cleanup = (now: number) => {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  };

  let lastCleanupAt = Date.now();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const now = Date.now();
    if (now - lastCleanupAt >= Math.max(options.windowMs, 60_000)) {
      cleanup(now);
      lastCleanupAt = now;
    }

    const keySuffix = options.keyGenerator ? options.keyGenerator(req) : req.ip;
    const key = `${keyPrefix}:${keySuffix}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (current.count >= options.max) {
      next(tooManyRequests(options.message));
      return;
    }

    current.count += 1;
    buckets.set(key, current);
    next();
  };
}
