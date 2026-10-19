import { createServer } from "node:http";

const port = 4180;
const components = ["service-authentication.database"];

/**
 * The platform servers under test, each reading its own published downtime at fixed times.
 * The reader caches a value for a minute, so a server cannot switch states during a run.
 */
export const downtimes = {
  none: { port: 4173, downtime: null },
  scheduled: { port: 4174, downtime: { components, start: "2099-01-12T06:00:00Z", end: "2099-01-12T08:30:00Z" } },
  started: { port: 4175, downtime: { components, start: "2026-01-12T06:00:00Z", end: "2099-01-12T08:30:00Z" } },
};

/** Where the platform server of a state reads its downtime. */
export function downtimeUrl(state: string) {
  return `http://127.0.0.1:${port}/${state}.json`;
}

/** The platform server that reads a state's downtime. */
export function platformOrigin(state: keyof typeof downtimes) {
  return `http://127.0.0.1:${downtimes[state].port}`;
}

/** Publishes each state's downtime file, as the infra repository serves the real one. */
export default async function publishDowntimes() {
  const server = createServer((request, response) => {
    const published = Object.entries(downtimes).find(([state]) => request.url === `/${state}.json`);
    response.writeHead(published ? 200 : 404, { "content-type": "application/json" });
    response.end(JSON.stringify(published?.[1].downtime ?? null));
  });
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  return () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
