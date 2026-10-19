import { GCLOUD_PROJECT_ID, OTEL } from "$app/env/private";

import { startTelemetry } from "@a-novel-kit/nodelib-server/telemetry";

const telemetry = startTelemetry({
  serviceName: "platform-template",
  enabled: OTEL,
  gcloudProjectId: GCLOUD_PROJECT_ID,
});

// adapter-node emits this once the server has closed, so the buffered spans leave before the exit.
process.on("sveltekit:shutdown", () => void telemetry.shutdown());
