const HTTP_URL_REGEX = /https?:\/\/[^\s"'<>]+/i;
const BI_PAY_HOST = "pay.ebi.com.gt";
const BI_LINK_HOST = "link.ebi.com.gt";

function parseSafeHttpUrl(raw: string): string | null {
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

export function normalizePaymentLinkInput(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  for (const attempt of decodeCandidates(trimmed)) {
    const direct = parseSafeHttpUrl(attempt);
    if (direct) return direct;

    const srcMatch = attempt.match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
    if (srcMatch) {
      const parsedSrc = parseSafeHttpUrl(srcMatch);
      if (parsedSrc) return parsedSrc;
    }

    const inlineUrl = attempt.match(HTTP_URL_REGEX)?.[0];
    if (inlineUrl) {
      const parsedInline = parseSafeHttpUrl(inlineUrl);
      if (parsedInline) return parsedInline;
    }
  }

  return null;
}

export function isBiPayCheckoutLink(raw: string | null | undefined): boolean {
  const normalized = normalizePaymentLinkInput(raw);
  if (!normalized) return false;

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    return host === BI_LINK_HOST || host === `www.${BI_LINK_HOST}`;
  } catch {
    return false;
  }
}

export function getBiPayEmbedUrl(raw: string | null | undefined): string | null {
  const normalized = normalizePaymentLinkInput(raw);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    const host = url.hostname.toLowerCase();
    if (host === BI_PAY_HOST && url.pathname.startsWith("/bpayembed/")) {
      return url.toString();
    }
  } catch {
    return null;
  }

  return null;
}
