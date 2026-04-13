export function readCookieValue(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;

  for (const chunk of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = chunk.split("=");
    if (rawName?.trim() !== name) continue;
    const joinedValue = rawValue.join("=").trim();
    if (!joinedValue) return null;
    try {
      return decodeURIComponent(joinedValue);
    } catch {
      return joinedValue;
    }
  }

  return null;
}
