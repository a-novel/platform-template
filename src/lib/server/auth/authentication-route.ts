import { validateLogin } from "#lib/application/auth/forms.js";
import { safeReturnTo } from "#lib/application/auth/navigation.js";
import type { AuthenticationFeedback, AuthenticationPanelModel } from "#lib/application/auth/types.js";
import { createAuthenticationContext } from "#lib/server/auth/context.js";
import { refuseDuringDowntime } from "#lib/server/downtime.js";

import { isHttpStatusError } from "@a-novel-kit/nodelib-browser/http";

import type { RequestEvent } from "@sveltejs/kit";
import { fail, redirect } from "@sveltejs/kit";

function serviceError(feedback: AuthenticationFeedback): AuthenticationPanelModel {
  return { journey: "login", state: { status: "service-error", feedback } };
}

/** Maps a rejected login to its feedback, without exposing what the service said. */
function loginFailure(error: unknown) {
  if (isHttpStatusError(error, 401)) return fail(401, { authentication: serviceError("invalidCredentials") });
  if (isHttpStatusError(error, 429)) return fail(429, { authentication: serviceError("tooManyAttempts") });
  return fail(503, { authentication: serviceError("serviceUnavailable") });
}

export const authenticationActions = {
  default: async (event: RequestEvent) => {
    await refuseDuringDowntime();

    const input = validateLogin(await event.request.formData());
    if (!input.success) {
      return fail(400, {
        authentication: {
          journey: "login",
          state: { status: "validation-error", issues: input.issues },
        } satisfies AuthenticationPanelModel,
      });
    }

    try {
      await createAuthenticationContext(event).session.login(input.value.email, input.value.password);
    } catch (error) {
      return loginFailure(error);
    }

    redirect(303, safeReturnTo(event.url.searchParams.get("returnTo")));
  },
};
