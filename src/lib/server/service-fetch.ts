import { readFile } from "node:fs/promises";

/** ServiceFetchOptions describes who a platform service call is made for. */
export interface ServiceFetchOptions {
  /** The file of the projected service token, on Kubernetes. */
  serviceTokenPath?: string;
  /** The visitor the call is made for. Health probes, made for nobody, leave it unset. */
  visitorAddress?: string;
}

/**
 * Wraps fetch for calls to a platform service. The service rate-limits by the visitor named in
 * `X-Client-IP`, which it trusts because it admits only the platform's identity.
 */
export function serviceFetch(options: ServiceFetchOptions, base: typeof fetch = fetch): typeof fetch {
  return async (input, init) => await base(input, { ...init, headers: await serviceHeaders(options, init?.headers) });
}

/** Adds the headers of a platform service call to a request's own, for a client that takes no fetch. */
export async function serviceHeaders(options: ServiceFetchOptions, init?: HeadersInit): Promise<Headers> {
  const headers = new Headers(init);
  if (options.visitorAddress) headers.set("X-Client-IP", options.visitorAddress);
  // The kubelet rotates the projected token in place, so each call reads the current one.
  if (options.serviceTokenPath) {
    headers.set("X-Service-Authorization", await readFile(options.serviceTokenPath, "utf8"));
  }

  return headers;
}
