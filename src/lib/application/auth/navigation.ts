const placeholderOrigin = "https://template.invalid";

/** Tells whether a decoded path could reach another origin or inject a header line. */
function isUnsafePath(decoded: string): boolean {
  if (decoded.startsWith("//") || decoded.includes("\\")) return true;
  return [...decoded].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
}

/**
 * Keeps local return destinations outside the sign-in routes, removing the return parameter and
 * form-action controls to prevent replay loops.
 */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value?.startsWith("/")) return "/";

  try {
    if (isUnsafePath(decodeURIComponent(value))) return "/";
    const target = new URL(value, placeholderOrigin);
    if (target.origin !== placeholderOrigin || target.pathname.startsWith("//")) return "/";
    if (target.pathname.startsWith("/auth/")) return "/";
    target.searchParams.delete("returnTo");
    for (const key of [...target.searchParams.keys()]) {
      if (key.startsWith("/")) target.searchParams.delete(key);
    }
    return target.pathname + target.search + target.hash;
  } catch {
    return "/";
  }
}

/** Signs the visitor in through the account platform, then returns them to a safe page. */
export function signInHref(returnTo: string): string {
  return "/auth/sign-in?" + new URLSearchParams({ returnTo: safeReturnTo(returnTo) });
}

const signInFailures = ["rejected", "unavailable", "rate-limited"] as const;

/**
 * Why a sign-in through the account platform did not complete. A rejected one may retry at once, while
 * an unavailable or rate-limited one waits a few minutes.
 */
export type SignInFailure = (typeof signInFailures)[number];

/** Links the failed sign-in page, which offers to sign in again toward the same page. */
export function signInFailedHref(returnTo: string, failure: SignInFailure): string {
  const parameters = new URLSearchParams({ returnTo: safeReturnTo(returnTo) });
  if (failure !== "rejected") parameters.set("reason", failure);
  return "/auth/sign-in/failed?" + parameters;
}

/** Reads why a sign-in failed from its page's parameters. An unknown reason reads as a rejection. */
export function readSignInFailure(parameters: Pick<URLSearchParams, "get">): SignInFailure {
  const reason = parameters.get("reason");
  return signInFailures.find((failure) => failure === reason) ?? "rejected";
}
