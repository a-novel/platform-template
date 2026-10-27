import { version } from "$app/env";
import { PUBLIC_SENTRY_DSN } from "$app/env/public";

import { BrowserTelemetry } from "@a-novel-kit/nodelib-browser/telemetry";

/** Reports the visitor's errors, page loads and navigations to Sentry, once they consent. */
export const telemetry = new BrowserTelemetry({ dsn: PUBLIC_SENTRY_DSN, release: `platform-template@${version}` });
