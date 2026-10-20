const placeholderOrigin = "https://template.invalid";

/** Tells whether a decoded path could reach another origin or inject a header line. */
function isUnsafePath(decoded: string): boolean {
  if (decoded.startsWith("//") || decoded.includes("\\")) return true;
  return [...decoded].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}

/** Keeps local return destinations, removing modal and form-action controls to prevent replay loops. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value?.startsWith("/")) return "/";

  try {
    if (isUnsafePath(decodeURIComponent(value))) return "/";
    const target = new URL(value, placeholderOrigin);
    if (target.origin !== placeholderOrigin || target.pathname.startsWith("//")) return "/";
    target.searchParams.delete("auth");
    target.searchParams.delete("returnTo");
    for (const key of [...target.searchParams.keys()]) {
      if (key.startsWith("/")) target.searchParams.delete(key);
    }
    return target.pathname + target.search + target.hash;
  } catch {
    return "/";
  }
}

/** Opens the shell's existing login modal and returns to a safe page after authentication. */
export function loginHref(returnTo: string): string {
  return "/?" + new URLSearchParams({ auth: "login", returnTo: safeReturnTo(returnTo) });
}
