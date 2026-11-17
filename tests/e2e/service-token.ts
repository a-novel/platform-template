import { tmpdir } from "node:os";
import { join } from "node:path";

import { serviceTokenSetup } from "@a-novel-kit/nodelib-test/playwright";

/** The platform's caller, which Authentication's client registry names in `builds/compose.e2e.yaml`. */
export const platformCaller = "system:serviceaccount:template:web";

/** The account platform's caller, the only one that may create accounts in the journeys' fixtures. */
export const accountCaller = "system:serviceaccount:account:web";

const directory = join(tmpdir(), "platform-template-e2e");

/** The file the platform servers under test read their service token from, as a pod reads its projected token. */
export const serviceTokenPath = join(directory, "service-token");

/** The file the platform servers under test read their profile service token from. */
export const profileServiceTokenPath = join(directory, "profile-service-token");

/** Gives the platform servers under test the platform's service tokens. */
export default serviceTokenSetup([
  { path: serviceTokenPath, subject: platformCaller },
  { path: profileServiceTokenPath, subject: platformCaller, audience: "profile" },
]);
