/** Cloud Run's metadata server mints Google ID tokens for the runtime's own service account. */
const identityUrl = "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity";

/** Google ID tokens last an hour; renew them five minutes early. */
const identityTokenTtlMs = 55 * 60 * 1000;

const identityTokens = new Map<string, { token: Promise<string>; expiresAt: number }>();

async function readIdentityToken(response: Response): Promise<string> {
  if (!response.ok) throw new Error(`The platform's identity token is unavailable: HTTP ${response.status}`);
  return await response.text();
}

function identityToken(audience: string): Promise<string> {
  const cached = identityTokens.get(audience);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const token = fetch(`${identityUrl}?audience=${encodeURIComponent(audience)}`, {
    headers: { "Metadata-Flavor": "Google" },
  }).then(readIdentityToken);

  // Concurrent calls share one request; a failed one is retried by the next call.
  identityTokens.set(audience, { token, expiresAt: Date.now() + identityTokenTtlMs });
  token.catch(() => identityTokens.delete(audience));

  return token;
}

/** ServiceFetchOptions describes who a platform service call is made for. */
export interface ServiceFetchOptions {
  /** The audience the service's IAM admits. Unset outside Cloud Run, where no IAM gates services. */
  audience?: string;
  /** The visitor the call is made for. Health probes, made for nobody, leave it unset. */
  visitorAddress?: string;
}

/**
 * Wraps fetch for calls to a platform service. The service rate-limits by the visitor named in
 * `X-Client-IP`, which it trusts because its IAM admits only the platform's identity.
 */
export function serviceFetch(options: ServiceFetchOptions, base: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const headers = new Headers(init?.headers);
    if (options.visitorAddress) headers.set("X-Client-IP", options.visitorAddress);
    if (options.audience) headers.set("X-Serverless-Authorization", `Bearer ${await identityToken(options.audience)}`);

    return await base(input, { ...init, headers });
  };
}
