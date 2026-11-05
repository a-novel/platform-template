import { getRuntimeConfig } from "../runtime-config.server";
import { type ServiceFetchOptions, serviceHeaders } from "../service-fetch";

import { isHttpStatusError } from "@a-novel-kit/nodelib-browser/http";
import { type Profile, ProfileApi, profileGetSelf } from "@a-novel/service-profile-rest";

import type { RequestEvent } from "@sveltejs/kit";
import type { ZodType } from "zod";

/** ProfileContext is the profile client of one request, and the visitor's own profile it read. */
export interface ProfileContext {
  api: ProfileApi;
  /**
   * Reads the visitor's own profile, or null before their first write. Every load of the request
   * shares one read; an outage throws.
   */
  self(accessToken: string): Promise<Profile | null>;
}

/** ProfileEvent is the part of a request the profile context reads. */
export type ProfileEvent = Pick<RequestEvent, "cookies" | "getClientAddress">;

/** A user's public profile, as the platform shows it. Each part is absent until its owner sets it. */
export interface ProfileSummary {
  username?: string;
  /** The picture's address on the account platform, which names its version. */
  picture?: string;
}

// SvelteKit hands the hooks, actions and loads of one request the same cookies object.
const requestContexts = new WeakMap<ProfileEvent["cookies"], ProfileContext>();

/**
 * Sends the profile client's calls as the platform's calls to a service, with the profile token and
 * the visitor's address. The client builds its requests on the global fetch, so this adds the headers.
 */
class ServiceProfileApi extends ProfileApi {
  constructor(
    baseUrl: string,
    private readonly identity: ServiceFetchOptions
  ) {
    super(baseUrl);
  }

  override async fetchVoid(input: string, init?: RequestInit): Promise<void> {
    await super.fetchVoid(input, await this.identify(init));
  }

  override async fetch<T>(input: string, validator?: ZodType<T>, init?: RequestInit): Promise<T> {
    return await super.fetch(input, validator, await this.identify(init));
  }

  override async fetchBlob(input: string, init?: RequestInit): Promise<Blob> {
    return await super.fetchBlob(input, await this.identify(init));
  }

  private async identify(init?: RequestInit): Promise<RequestInit> {
    return { ...init, headers: await serviceHeaders(this.identity, init?.headers) };
  }
}

/** Returns the profile client of one visitor's request, which every load and action of it shares. */
export function getProfileContext(event: ProfileEvent): ProfileContext {
  const shared = requestContexts.get(event.cookies);
  if (shared) return shared;

  const config = getRuntimeConfig();
  const api = new ServiceProfileApi(config.profileServiceUrl, {
    serviceTokenPath: config.profileServiceTokenPath,
    visitorAddress: event.getClientAddress(),
  });
  let self: Promise<Profile | null> | undefined;
  const context: ProfileContext = { api, self: (accessToken) => (self ??= readSelf(api, accessToken)) };

  requestContexts.set(event.cookies, context);
  return context;
}

async function readSelf(api: ProfileApi, accessToken: string): Promise<Profile | null> {
  try {
    return await profileGetSelf(api, accessToken);
  } catch (error) {
    // A profile exists from its owner's first write.
    if (isHttpStatusError(error, 404)) return null;
    throw error;
  }
}

/**
 * Turns a profile into what the platform shows. The account platform serves the picture at an
 * address that names its version, so the browser keeps each version for good.
 */
export function summarizeProfile(profile: Profile | null, accountUrl: string): ProfileSummary {
  if (!profile) return {};

  const picture = profile.pictureVersion
    ? new URL(`/profile/picture/${profile.id}?${new URLSearchParams({ v: profile.pictureVersion })}`, accountUrl).href
    : undefined;
  return { username: profile.username, picture };
}
