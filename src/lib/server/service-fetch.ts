import { readFile } from "node:fs/promises";

/** Cloud Run's metadata server mints Google ID tokens for the runtime's own service account. */
const identityUrl = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity";

/** Google ID tokens last an hour. The platform renews them five minutes early. */
const identityTokenTtlMs = 55 * 60 * 1000;

const identityTokens = new Map<string, { token: Promise<string>; expiresAt: number }>();

async function fetchIdentityToken(audience: string): Promise<string> {
  const response = await fetch(`${identityUrl}?audience=${encodeURIComponent(audience)}`, {
    headers: { "Metadata-Flavor": "Google" },
  });
  if (response.ok) return await response.text();

  // An unread body keeps its connection open until garbage collection.
  await response.body?.cancel();
  throw new Error(`The platform's identity token is unavailable: HTTP ${response.status}`);
}

function identityToken(audience: string): Promise<string> {
  const cached = identityTokens.get(audience);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const token = fetchIdentityToken(audience);
  // Concurrent calls share one request. The next call retries a failed one.
  identityTokens.set(audience, { token, expiresAt: Date.now() + identityTokenTtlMs });
  token.catch(() => identityTokens.delete(audience));

  return token;
}

/** ServiceFetchOptions describes who a platform service call is made for. */
export interface ServiceFetchOptions {
  /** The audience the service's IAM admits. Unset outside Cloud Run, where no IAM gates services. */
  audience?: string;
  /** The file of the projected service token, on Kubernetes. It takes precedence over the audience. */
  serviceTokenPath?: string;
  /** The visitor the call is made for. Health probes, made for nobody, leave it unset. */
  visitorAddress?: string;
}

/**
 * Wraps fetch for calls to a platform service. The service rate-limits by the visitor named in
 * `X-Client-IP`, which it trusts because it admits only the platform's identity.
 */
export function serviceFetch(options: ServiceFetchOptions, base: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    if (options.visitorAddress) headers.set("X-Client-IP", options.visitorAddress);
    // The kubelet rotates the projected token in place, so each call reads the current one.
    if (options.serviceTokenPath) {
      headers.set("X-Serverless-Authorization", `Bearer ${await readFile(options.serviceTokenPath, "utf8")}`);
    } else if (options.audience) {
      headers.set("X-Serverless-Authorization", `Bearer ${await identityToken(options.audience)}`);
    }

    return await base(input, { ...init, headers });
  };
}
