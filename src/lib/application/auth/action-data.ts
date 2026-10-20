import type { AuthDialogView } from "#lib/application/shell/types.js";

import type { AuthenticationPanelModel } from "./types";

/** AuthenticationActionData is the result the shell dialog's action returns to the page. */
export interface AuthenticationActionData {
  authentication?: AuthenticationPanelModel;
}

/** Returns the dialog state an action left for a journey, or null for another journey or malformed data. */
export function readAuthenticationActionModel(data: unknown, journey: AuthDialogView): AuthenticationPanelModel | null {
  if (!data || typeof data !== "object" || !("authentication" in data)) return null;

  const model = (data as AuthenticationActionData).authentication;
  return model?.journey === journey ? model : null;
}
