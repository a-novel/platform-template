import { type JwtPayload, createJwtVerifier } from "@a-novel-kit/nodelib-server";
import { JsonKeysApi, jwkList } from "@a-novel/service-json-keys-rest";

// Page loads wait on JSON keys while the verifier fetches its keys, so each fetch has a deadline.
const keysTimeoutMs = 2000;

/**
 * Builds the verifier of Authentication's access tokens. JSON keys signs them under its `auth` usage,
 * whose claims and key timings the options mirror. Build one per process: it caches the keys.
 */
export function createAccessTokenVerifier(jsonKeysServiceUrl: string): (accessToken: string) => Promise<JwtPayload> {
  const keys = new JsonKeysApi(jsonKeysServiceUrl, (input, init) =>
    fetch(input, { ...init, signal: AbortSignal.timeout(keysTimeoutMs) })
  );

  return createJwtVerifier({
    fetchKeys: () => jwkList(keys, "auth"),
    issuer: "anovel-authentication",
    audience: "anovel-client",
    subject: "user-access",
    leewayMs: 5 * 60_000,
    cacheMs: 30 * 60_000,
    staleIfErrorMs: 24 * 60 * 60_000,
  });
}
