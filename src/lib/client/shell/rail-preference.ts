const preferenceVersion = 1;

export const railPreferenceKey = "a-novel.template.shell";

interface StorageReader {
  getItem(key: string): string | null;
}

interface StorageWriter {
  setItem(key: string, value: string): void;
}

/** Reads the versioned rail preference without assuming available storage. */
export function readRailCollapsed(storage?: StorageReader): boolean {
  if (!storage) return false;

  try {
    const raw = storage.getItem(railPreferenceKey);
    if (!raw) return false;

    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return false;

    const preference = value as Record<string, unknown>;
    return preference.version === preferenceVersion && preference.railCollapsed === true;
  } catch {
    return false;
  }
}

/** Persists the current rail preference and reports whether storage accepted it. */
export function writeRailCollapsed(storage: StorageWriter | undefined, railCollapsed: boolean): boolean {
  if (!storage) return false;

  try {
    storage.setItem(
      railPreferenceKey,
      JSON.stringify({
        version: preferenceVersion,
        railCollapsed,
      })
    );
    return true;
  } catch {
    return false;
  }
}
