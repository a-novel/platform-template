import type { AuthDialogView } from "./types";

const authParameter = "auth";
const menuParameter = "menu";

/** Reads a parameter that appears exactly once. A duplicate counts as absent. */
function singleValue(parameters: URLSearchParams, name: string): string | undefined {
  const values = parameters.getAll(name);
  return values.length === 1 ? values[0] : undefined;
}

/** Returns a copy of the URL with one value for the parameter, or without it for null. */
function withParameter(url: URL, name: string, value: string | null): URL {
  const next = new URL(url);
  next.searchParams.delete(name);
  if (value) next.searchParams.set(name, value);
  return next;
}

function isAuthDialogView(value: string): value is AuthDialogView {
  return value === "login";
}

/** Reads the mobile navigation's canonical URL state. */
export function readNavigationOpen(parameters: URLSearchParams): boolean {
  return singleValue(parameters, menuParameter) === "open";
}

/** Returns a URL with canonical mobile navigation state. */
export function withNavigationOpen(url: URL, open: boolean): URL {
  return withParameter(url, menuParameter, open ? "open" : null);
}

/** Reads one canonical authentication view. Duplicate and invalid values close the dialog. */
export function readAuthView(parameters: URLSearchParams): AuthDialogView | null {
  const value = singleValue(parameters, authParameter);
  return value !== undefined && isAuthDialogView(value) ? value : null;
}

/** Returns a URL with canonical authentication state while preserving unrelated state. */
export function withAuthView(url: URL, view: AuthDialogView | null): URL {
  return withParameter(url, authParameter, view);
}

/** Removes invalid or duplicate authentication values from a shareable URL. */
export function normalizeAuthUrl(url: URL): URL {
  return readAuthView(url.searchParams) ? new URL(url) : withAuthView(url, null);
}
