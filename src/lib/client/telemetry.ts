import { version } from "$app/env";
import { PUBLIC_FARO_URL, PUBLIC_PLATFORM_DOMAIN } from "$app/env/public";

import { BrowserTelemetry } from "@a-novel-kit/nodelib-browser/telemetry";

/** Reports the visitor's errors, page views and requests to Grafana Faro, once they consent. */
export const telemetry = new BrowserTelemetry({
  url: PUBLIC_FARO_URL,
  name: "platform-template",
  version,
  consentDomain: PUBLIC_PLATFORM_DOMAIN,
});
