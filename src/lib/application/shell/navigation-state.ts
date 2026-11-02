const menuParameter = "menu";

/** Reads the mobile navigation's canonical URL state. A duplicate parameter counts as closed. */
export function readNavigationOpen(parameters: URLSearchParams): boolean {
  const values = parameters.getAll(menuParameter);
  return values.length === 1 && values[0] === "open";
}

/** Returns a copy of the URL with canonical mobile navigation state, preserving unrelated state. */
export function withNavigationOpen(url: URL, open: boolean): URL {
  const next = new URL(url);
  next.searchParams.delete(menuParameter);
  if (open) next.searchParams.set(menuParameter, "open");
  return next;
}
