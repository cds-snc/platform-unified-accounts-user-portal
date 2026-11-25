import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getOriginalHostFromHeaders } from "./host";

vi.mock("next/headers");

function makeHeaders(map: Record<string, string | null>): { get: (name: string) => string | null } {
  return { get: (name: string) => map[name] ?? null };
}

describe("getOriginalHostFromHeaders", () => {
  beforeEach(() => {
    vi.stubEnv("APP_HOSTS", "auth.cdssandbox.xyz, HTTPS://Forms-Staging.cdssandbox.xyz/,localhost");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test.each(["auth.cdssandbox.xyz", "forms-staging.cdssandbox.xyz", "localhost:3002"])(
    "accepts %s from APP_HOSTS",
    (host) => {
      expect(getOriginalHostFromHeaders(makeHeaders({ host }))).toBe(host);
    }
  );

  test.each([
    "attacker.example",
    "evil.auth.cdssandbox.xyz",
    "auth.cdssandbox.xyz.evil.com",
    "session.canada.ca",
    "127.0.0.1:3002",
    "[::1]:3002",
    "abc123.lambda-url.ca-central-1.on.aws",
  ])("rejects %s when not in APP_HOSTS", (host) => {
    expect(() => getOriginalHostFromHeaders(makeHeaders({ host }))).toThrow(
      "Untrusted host header"
    );
  });

  test.each([undefined, "", " , "])("rejects every host when APP_HOSTS is %j", (appHosts) => {
    vi.stubEnv("APP_HOSTS", appHosts);
    expect(() => getOriginalHostFromHeaders(makeHeaders({ host: "localhost:3002" }))).toThrow(
      "Untrusted host header"
    );
  });

  test("rejects a forwarded host that is not in APP_HOSTS even if host is trusted", () => {
    expect(() =>
      getOriginalHostFromHeaders(
        makeHeaders({ "x-forwarded-host": "session.canada.ca", host: "auth.cdssandbox.xyz" })
      )
    ).toThrow("Untrusted host header");
  });

  test("throws when no host header is present", () => {
    expect(() => getOriginalHostFromHeaders({ get: () => null })).toThrow(
      "No host found in headers"
    );
  });

  test("x-forwarded-host takes priority over x-original-host and host", () => {
    expect(
      getOriginalHostFromHeaders(
        makeHeaders({
          "x-forwarded-host": "auth.cdssandbox.xyz",
          "x-original-host": "attacker.example",
          host: "attacker.example",
        })
      )
    ).toBe("auth.cdssandbox.xyz");
  });

  test("x-original-host takes priority over host when x-forwarded-host is absent", () => {
    expect(
      getOriginalHostFromHeaders(
        makeHeaders({ "x-original-host": "auth.cdssandbox.xyz", host: "attacker.example" })
      )
    ).toBe("auth.cdssandbox.xyz");
  });

  test("uses first value from a comma-separated x-forwarded-host header", () => {
    expect(
      getOriginalHostFromHeaders(
        makeHeaders({ "x-forwarded-host": "auth.cdssandbox.xyz, proxy.internal" })
      )
    ).toBe("auth.cdssandbox.xyz");
  });
});
