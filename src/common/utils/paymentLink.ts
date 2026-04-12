const HTTP_URL_REGEX = /https?:\/\/[^\s"'<>]+/i;

function parseHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function decodeCandidates(raw: string): string[] {
  const attempts = [raw];
  let current = raw;
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (!decoded || decoded === current) break;
      attempts.push(decoded);
      current = decoded;
    } catch {
      break;
    }
  }
  return attempts;
}

export function extractHttpUrlFromText(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  for (const attempt of decodeCandidates(trimmed)) {
    const direct = parseHttpUrl(attempt);
    if (direct) return direct;

    const srcMatch = attempt.match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
    if (srcMatch) {
      const parsedSrc = parseHttpUrl(srcMatch);
      if (parsedSrc) return parsedSrc;
    }

    const inlineUrl = attempt.match(HTTP_URL_REGEX)?.[0];
    if (inlineUrl) {
      const parsedInline = parseHttpUrl(inlineUrl);
      if (parsedInline) return parsedInline;
    }
  }

  return null;
}

export function normalizePaymentLinkValue(value: unknown): unknown {
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return extractHttpUrlFromText(trimmed) ?? trimmed;
}
