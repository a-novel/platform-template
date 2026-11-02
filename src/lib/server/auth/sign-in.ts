import { type SignInFailure, safeReturnTo, signInFailedHref } from "#lib/application/auth/navigation.js";

import { refuseDuringDowntime } from "../downtime";
import { getRuntimeConfig } from "../runtime-config.server";
import { type AuthenticationEvent, getAuthenticationContext } from "./context";

import { createHash, randomBytes } from "node:crypto";

import { isHttpStatusError } from "@a-novel-kit/nodelib-browser/http";
import { OAuthError } from "@a-novel/service-authentication-rest";

import { redirect } from "@sveltejs/kit";
import { z } from "zod";

/** The platform's client ID in Authentication's client registry. */
const clientId = "template";
/** The path of the platform's redirect URI, which the client registry holds on the platform's origin. */
const callbackPath = "/auth/callback";

/** The cookie that keeps a started sign-in until the account platform answers it, for ten minutes. */
const pendingCookie = "template_sign_in";
const pendingLifetimeSeconds = 10 * 60;
const PendingSignInSchema = z.object({ state: z.string(), verifier: z.string(), returnTo: z.string() });

/** The account platform's error codes that ask the client to try again later (RFC 6749 §4.1.2.1). */
const temporaryErrors = new Set(["temporarily_unavailable", "server_error"]);

/**
 * Starts a sign-in at the account platform's authorization endpoint (RFC 6749 §4.1.1). The platform
 * draws a `state` and a PKCE verifier (RFC 7636 §4.1), keeps them with the page to return to in an
 * HttpOnly cookie only the callback receives, and sends the S256 challenge of the verifier.
 */
export async function startSignIn(event: AuthenticationEvent): Promise<never> {
  await refuseDuringDowntime();

  const authorization = new URL("/authorize", getRuntimeConfig().accountUrl);
  const state = randomValue();
  const verifier = randomValue();

  authorization.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: callbackUri(event.url),
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  }).toString();

  const returnTo = safeReturnTo(event.url.searchParams.get("returnTo"));
  event.cookies.set(pendingCookie, JSON.stringify({ state, verifier, returnTo }), {
    httpOnly: true,
    path: callbackPath,
    sameSite: "lax",
    secure: event.url.protocol === "https:",
    maxAge: pendingLifetimeSeconds,
  });

  redirect(303, authorization.href, { external: true });
}

/**
 * Completes a sign-in at the platform's redirect URI (RFC 6749 §4.1.2). The response counts only with
 * the started sign-in's `state` and the account platform's origin as `iss` (RFC 9207 §2.4). The
 * platform then exchanges the code with its PKCE verifier, keeps the tokens, and returns the visitor
 * to their page. Any other outcome lands on the failed sign-in page, which offers a retry.
 */
export async function completeSignIn(event: AuthenticationEvent): Promise<Response> {
  const pending = PendingSignInSchema.safeParse(parseJson(event.cookies.get(pendingCookie))).data;
  event.cookies.delete(pendingCookie, { path: callbackPath });

  const returnTo = pending?.returnTo ?? "/";
  const failure = pending ? await exchangeCode(event, pending) : "rejected";

  return leaveCallback(failure ? signInFailedHref(returnTo, failure) : returnTo);
}

/** Exchanges the code of the authorization response, or tells why the sign-in did not complete. */
async function exchangeCode(
  event: AuthenticationEvent,
  pending: z.infer<typeof PendingSignInSchema>
): Promise<SignInFailure | null> {
  const response = event.url.searchParams;
  const issuer = new URL(getRuntimeConfig().accountUrl).origin;
  if (single(response, "state") !== pending.state || single(response, "iss") !== issuer) return "rejected";

  const error = single(response, "error");
  if (error) return temporaryErrors.has(error) ? "unavailable" : "rejected";

  const code = single(response, "code");
  if (!code) return "rejected";

  try {
    const grant = { code, code_verifier: pending.verifier, redirect_uri: callbackUri(event.url) };
    await getAuthenticationContext(event).session.signIn(grant);
    return null;
  } catch (cause) {
    if (cause instanceof OAuthError) return "rejected";
    return isHttpStatusError(cause, 429) ? "rate-limited" : "unavailable";
  }
}

/** The platform's redirect URI, on the origin of the request the visitor sent. */
function callbackUri(url: URL): string {
  return new URL(callbackPath, url.origin).href;
}

/** A 256-bit random value in base64url, which is 43 characters: both a `state` and a PKCE verifier. */
function randomValue(): string {
  return randomBytes(32).toString("base64url");
}

/** Reads a response parameter given exactly once. A repeated one counts as absent. */
function single(parameters: URLSearchParams, name: string): string | undefined {
  const values = parameters.getAll(name);
  return values.length === 1 ? values[0] : undefined;
}

function parseJson(value: string | undefined): unknown {
  try {
    return value === undefined ? undefined : JSON.parse(value);
  } catch {
    return undefined;
  }
}

/** Redirects away from the callback, so its code leaves the address bar and never reaches a referrer. */
function leaveCallback(location: string): Response {
  return new Response(null, {
    status: 303,
    headers: { location, "cache-control": "no-store", "referrer-policy": "no-referrer" },
  });
}
