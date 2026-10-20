import type { AuthDialogView } from "./types";

const authParameter = "auth";

/** Reads the mobile navigation's canonical URL state. */
export function readNavigationOpen(parameters: URLSearchParams): boolean {
  return parameters.getAll("menu").length === 1 && parameters.get("menu") === "open";
}

/** Returns a URL with canonical mobile navigation state. */
export function withNavigationOpen(url: URL, open: boolean): URL {
  const next = new URL(url);
  next.searchParams.delete("menu");
  if (open) next.searchParams.set("menu", "open");
  return next;
}

function isAuthDialogView(value: string): value is AuthDialogView {
  return value === "login";
}

/** Reads one canonical authentication view. Duplicate and invalid values close the dialog. */
export function readAuthView(parameters: URLSearchParams): AuthDialogView | null {
  const values = parameters.getAll(authParameter);
  return values.length === 1 && values[0] !== undefined && isAuthDialogView(values[0]) ? values[0] : null;
}

/** Returns a URL with canonical authentication state while preserving unrelated state. */
export function withAuthView(url: URL, view: AuthDialogView | null): URL {
  const next = new URL(url);
  next.searchParams.delete(authParameter);
  if (view) next.searchParams.set(authParameter, view);
  return next;
}

/** Removes invalid or duplicate authentication values from a shareable URL. */
export function normalizeAuthUrl(url: URL): URL {
  return readAuthView(url.searchParams) ? new URL(url) : withAuthView(url, null);
}
