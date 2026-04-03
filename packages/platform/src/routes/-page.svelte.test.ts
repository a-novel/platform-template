import { MockSessionAnon } from "$lib/test/mocks/session";
import "$lib/test/setup/base";

import { type Mock, describe, expect, it, vi } from "vitest";

import { SESSION_STORAGE_KEY } from "@a-novel/package-authentication";
import { claimsGet } from "@a-novel/service-authentication-rest";

import { render, waitFor } from "@testing-library/svelte";

vi.mock("$lib", async (importOriginal) => {
  const mod = await importOriginal<typeof import("$lib")>();
  const { AuthenticationApi } = await import("@a-novel/service-authentication-rest");
  return {
    ...mod,
    authenticationApi: new AuthenticationApi("http://auth-api.local"),
  };
});

vi.mock(import("@a-novel/service-authentication-rest"), async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    claimsGet: vi.fn(),
    tokenCreateAnon: vi.fn(),
  };
});

vi.mock("$env/static/public", () => ({
  PUBLIC_AUTHENTICATION_SERVICE_URL: "http://auth-api.local",
  PUBLIC_AUTHENTICATION_PLATFORM_URL: "http://auth.local",
}));

const mockClaimsGet = claimsGet as Mock;

describe("/", () => {
  it("renders hello world text", async () => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(MockSessionAnon));
    mockClaimsGet.mockResolvedValue(MockSessionAnon.claims);

    const { default: Page } = await import("./+page.svelte");
    const { UITestWrapper, createTestSnippet } = await import("$lib/test");
    const { authenticationApi } = await import("$lib");

    const page = render(UITestWrapper, {
      api: authenticationApi,
      children: createTestSnippet(Page, {}),
    });

    await waitFor(() => {
      expect(page.getByText(/hello world/i)).toBeInTheDocument();
    });
  });
});
