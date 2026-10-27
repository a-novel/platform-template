import { telemetry } from "#lib/client/telemetry.js";

import type { ClientInit, HandleClientError } from "@sveltejs/kit/hooks";

// The page hydrates without waiting for Sentry's SDK, which a consenting visitor downloads meanwhile.
export const init: ClientInit = () => void telemetry.start();

/** Reports the faults SvelteKit catches in loads and rendering; expected HTTP errors stay out. */
export const handleError: HandleClientError = ({ kind, error }) => {
  if (kind === "unknown") telemetry.captureError(error);
};
