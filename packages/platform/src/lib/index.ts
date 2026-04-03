export * from "./init";

/**
 * TODO: app title goes there.
 */
const AGORA_TITLE = "Agora";

export function pageTitle(...titles: string[]): string {
  return [...titles, AGORA_TITLE].join(" | ");
}
