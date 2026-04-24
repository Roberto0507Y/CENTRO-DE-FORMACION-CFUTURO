export const DEFAULT_CSRF_TTL_MS = 12 * 60 * 60 * 1000;

type CookiePolicyOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/api";
  maxAge?: number;
};

const DURATION_MULTIPLIERS: Record<"ms" | "s" | "m" | "h" | "d", number> = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function parseDurationToMs(raw: string | number | null | undefined, fallback?: number): number | undefined {
  if (raw === undefined || raw === null) return fallback;

  const normalized = String(raw).trim();
  if (!normalized) return fallback;

  const numeric = Number(normalized);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric * 1000;
  }

  const match = normalized.match(/^(\d+)\s*(ms|s|m|h|d)$/i);
  if (!match) return fallback;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase() as keyof typeof DURATION_MULTIPLIERS;
  return value * DURATION_MULTIPLIERS[unit];
}

function baseCookieOptions(nodeEnv: string, jwtExpiresIn: string | number | null | undefined): CookiePolicyOptions {
  return {
    httpOnly: true,
    secure: nodeEnv === "production",
    sameSite: "lax",
    path: "/api",
    maxAge: parseDurationToMs(jwtExpiresIn),
  };
}

export function buildAuthCookieOptions(
  nodeEnv: string,
  jwtExpiresIn: string | number | null | undefined
): CookiePolicyOptions {
  return baseCookieOptions(nodeEnv, jwtExpiresIn);
}

export function buildCsrfCookieOptions(
  nodeEnv: string,
  jwtExpiresIn: string | number | null | undefined,
  fallbackMs = DEFAULT_CSRF_TTL_MS
): CookiePolicyOptions {
  return {
    ...baseCookieOptions(nodeEnv, jwtExpiresIn),
    maxAge: parseDurationToMs(jwtExpiresIn, fallbackMs),
  };
}
