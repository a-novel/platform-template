import { OTEL } from "$app/env/private";

import { startTelemetry } from "@a-novel-kit/nodelib-server/telemetry";

// A liveness probe calls /ping around the clock, so its spans would only spend quota.
const telemetry = startTelemetry({ serviceName: "platform-template", enabled: OTEL, untracedRoutes: ["/ping"] });

// adapter-node emits this once the server has closed, so the buffered spans leave before the exit.
process.on("sveltekit:shutdown", () => void telemetry.shutdown());
