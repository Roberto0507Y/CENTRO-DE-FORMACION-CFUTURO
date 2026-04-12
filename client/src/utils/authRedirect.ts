export function getSafeAuthRedirect(search: string) {
  const redirect = new URLSearchParams(search).get("redirect");
  if (!redirect) return null;

  const isInternalPath = redirect.startsWith("/") && !redirect.startsWith("//");
  const isAuthPath = redirect.startsWith("/auth/");
  const hasUnsafeSlashes = redirect.includes("\\");

  return isInternalPath && !isAuthPath && !hasUnsafeSlashes ? redirect : null;
}
