import { afterEach, describe, expect, test, vi } from "vitest";

import { getOriginalHostFromHeaders } from "./server/host";
import { constructUrl, getServiceUrlFromHeaders } from "./service-url";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));
vi.mock("./server/host", () => ({
  getOriginalHostFromHeaders: vi.fn(),
}));

describe("service-url", () => {
  const originalApiUrl = process.env.ZITADEL_API_URL;
  const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    process.env.ZITADEL_API_URL = originalApiUrl;
    process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath;
  });

  test("prefers ZITADEL_API_URL for service requests", async () => {
    process.env.ZITADEL_API_URL = "https://zitadel.internal";

    await expect(getServiceUrlFromHeaders()).resolves.toEqual({
      serviceUrl: "https://zitadel.internal",
    });
  });

  test("uses trusted site host when API URL is unset", async () => {
    delete process.env.ZITADEL_API_URL;
    vi.mocked(getOriginalHostFromHeaders).mockReturnValue("forms-formulaires.alpha.canada.ca");

    await expect(getServiceUrlFromHeaders()).resolves.toEqual({
      serviceUrl: "https://forms-formulaires.alpha.canada.ca",
    });
  });

  test("allows localhost fallback for local development", async () => {
    delete process.env.ZITADEL_API_URL;
    vi.mocked(getOriginalHostFromHeaders).mockReturnValue("localhost:3002");
    await expect(getServiceUrlFromHeaders()).resolves.toEqual({
      serviceUrl: "http://localhost:3002",
    });
  });

  test("constructUrl uses validated host headers", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/auth";

    vi.mocked(getOriginalHostFromHeaders).mockReturnValue("forms-staging.cdssandbox.xyz");

    const url = constructUrl(
      {
        headers: {
          get: (name: string) =>
            name === "x-forwarded-host"
              ? "forms-staging.cdssandbox.xyz"
              : name === "host"
                ? "ignored.example"
                : null,
        },
        nextUrl: {
          protocol: "https:",
        },
      } as never,
      "/register/verify"
    );

    expect(url.toString()).toBe("https://forms-staging.cdssandbox.xyz/auth/register/verify");
  });
});
