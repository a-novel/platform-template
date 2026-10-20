import { validateLogin } from "#lib/application/auth/forms.js";
import { safeReturnTo } from "#lib/application/auth/navigation.js";
import type { AuthenticationPanelModel } from "#lib/application/auth/types.js";

import { refuseDuringDowntime } from "../downtime";
import { createAuthenticationContext } from "./context";

import { isHttpStatusError } from "@a-novel-kit/nodelib-browser/http";

import type { RequestEvent } from "@sveltejs/kit";
import { fail, redirect } from "@sveltejs/kit";

/** Fails the login with the form state the dialog shows. */
function failLogin(status: number, state: AuthenticationPanelModel["state"]) {
  return fail(status, { authentication: { journey: "login", state } satisfies AuthenticationPanelModel });
}

/** Maps a rejected login to its feedback, without exposing what the service said. */
function loginFailure(error: unknown) {
  if (isHttpStatusError(error, 401)) return failLogin(401, { status: "service-error", feedback: "invalidCredentials" });
  if (isHttpStatusError(error, 429)) return failLogin(429, { status: "service-error", feedback: "tooManyAttempts" });
  return failLogin(503, { status: "service-error", feedback: "serviceUnavailable" });
}

/** The shell dialog's form action, which logs the visitor in and returns them to a safe page. */
export const authenticationActions = {
  default: async (event: RequestEvent) => {
    await refuseDuringDowntime();

    const input = validateLogin(await event.request.formData());
    if (!input.success) return failLogin(400, { status: "validation-error", issues: input.issues });

    try {
      await createAuthenticationContext(event).session.login(input.value.email, input.value.password);
    } catch (error) {
      return loginFailure(error);
    }

    redirect(303, safeReturnTo(event.url.searchParams.get("returnTo")));
  },
};
