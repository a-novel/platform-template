import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** The platform's caller, which Authentication's client registry names in `builds/compose.e2e.yaml`. */
export const platformCaller = "system:serviceaccount:template:web";

/** The account platform's caller, the only one that may create accounts in the journeys' fixtures. */
export const accountCaller = "system:serviceaccount:account:web";

const directory = join(tmpdir(), "platform-template-e2e");

/** The file the platform servers under test read their service token from, as a pod reads its projected token. */
export const serviceTokenPath = join(directory, "service-token");

/** Draws a token for a caller from the stack's local issuer, which signs one for anyone who asks. */
async function serviceToken(subject: string): Promise<string> {
  const response = await fetch(
    `http://127.0.0.1:14101/token?${new URLSearchParams({ subject, audience: "authentication" })}`
  );
  if (!response.ok) throw new Error(`The service-token issuer answered ${response.status}: ${await response.text()}`);
  return await response.text();
}

/** Calls Authentication as a caller, which every route but the ping requires. */
export function callerFetch(subject: string): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("X-Service-Authorization", await serviceToken(subject));
    return await fetch(input, { ...init, headers });
  };
}

/** Gives the platform servers under test the platform's service token. */
export default async function writeServiceToken() {
  await mkdir(directory, { recursive: true });
  await writeFile(serviceTokenPath, await serviceToken(platformCaller));
  return () => rm(directory, { recursive: true, force: true });
}
