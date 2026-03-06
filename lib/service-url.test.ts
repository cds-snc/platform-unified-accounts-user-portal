import { afterEach, describe, expect, test } from "vitest";

import { constructUrl, getServiceUrlFromHeaders } from "./service-url";

describe("service-url", () => {
  const originalApiUrl = process.env.ZITADEL_API_URL;
  const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    process.env.ZITADEL_API_URL = originalApiUrl;
    process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath;
  });

  test("prefers ZITADEL_API_URL for service requests", () => {
    process.env.ZITADEL_API_URL = "https://zitadel.internal";

    expect(
      getServiceUrlFromHeaders({
        get: () => "attacker.example",
      } as never)
    ).toEqual({ serviceUrl: "https://zitadel.internal" });
  });

  test("uses trusted site host when API URL is unset", () => {
    delete process.env.ZITADEL_API_URL;

    expect(
      getServiceUrlFromHeaders({
        get: () => "forms-formulaires.alpha.canada.ca",
      } as never)
    ).toEqual({ serviceUrl: "https://forms-formulaires.alpha.canada.ca" });
  });

  test("allows localhost fallback for local development", () => {
    delete process.env.ZITADEL_API_URL;

    expect(
      getServiceUrlFromHeaders({
        get: () => "localhost:3002",
      } as never)
    ).toEqual({ serviceUrl: "http://localhost:3002" });
  });

  test("constructUrl uses validated host headers", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "/auth";

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
      "/verify"
    );

    expect(url.toString()).toBe("https://forms-staging.cdssandbox.xyz/auth/verify");
  });
});
