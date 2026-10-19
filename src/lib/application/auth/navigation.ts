/** Keeps local return destinations, removing modal and form-action controls to prevent replay loops. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value?.startsWith("/")) return "/";

  try {
    const decoded = decodeURIComponent(value);
    if (
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      [...decoded].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
    )
      return "/";
    const target = new URL(value, "https://template.invalid");
    if (target.origin !== "https://template.invalid" || target.pathname.startsWith("//")) return "/";
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
