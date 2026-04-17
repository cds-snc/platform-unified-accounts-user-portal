import { afterEach, describe, expect, test } from "vitest";

import { getOriginalHostFromHeaders } from "./host";

function makeHeaders(map: Record<string, string | null>): { get: (name: string) => string | null } {
  return { get: (name: string) => map[name] ?? null };
}

describe("host helpers", () => {
  const originalReviewEnv = process.env.REVIEW_ENV;

  afterEach(() => {
    process.env.REVIEW_ENV = originalReviewEnv;
  });

  test("accepts trusted site hosts from site-config", () => {
    expect(
      getOriginalHostFromHeaders({
        get: () => "forms-formulaires.alpha.canada.ca",
      })
    ).toBe("forms-formulaires.alpha.canada.ca");
  });

  test("allows localhost headers", () => {
    expect(
      getOriginalHostFromHeaders({
        get: () => "localhost:3002",
      })
    ).toBe("localhost:3002");
  });

  test("allows 127.0.0.1 as localhost", () => {
    expect(
      getOriginalHostFromHeaders({
        get: () => "127.0.0.1:3002",
      })
    ).toBe("127.0.0.1:3002");
  });

  test("allows ::1 as localhost", () => {
    expect(getOriginalHostFromHeaders(makeHeaders({ host: "[::1]:3002" }))).toBe("[::1]:3002");
  });

  test("rejects untrusted non-local hosts", () => {
    expect(() =>
      getOriginalHostFromHeaders({
        get: () => "attacker.example",
      })
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
          "x-forwarded-host": "forms-formulaires.alpha.canada.ca",
          "x-original-host": "attacker.example",
          host: "attacker.example",
        })
      )
    ).toBe("forms-formulaires.alpha.canada.ca");
  });

  test("x-original-host takes priority over host when x-forwarded-host is absent", () => {
    expect(
      getOriginalHostFromHeaders(
        makeHeaders({
          "x-original-host": "forms-formulaires.alpha.canada.ca",
          host: "attacker.example",
        })
      )
    ).toBe("forms-formulaires.alpha.canada.ca");
  });

  test("falls back to host header when forwarded headers are absent", () => {
    expect(
      getOriginalHostFromHeaders(makeHeaders({ host: "forms-formulaires.alpha.canada.ca" }))
    ).toBe("forms-formulaires.alpha.canada.ca");
  });

  test("uses first value from a comma-separated x-forwarded-host header", () => {
    expect(
      getOriginalHostFromHeaders(
        makeHeaders({
          "x-forwarded-host": "forms-formulaires.alpha.canada.ca, proxy.internal",
        })
      )
    ).toBe("forms-formulaires.alpha.canada.ca");
  });

  test("allows lambda PR review hosts", () => {
    const lambdaHost = "abc123.lambda-url.ca-central-1.on.aws";
    expect(getOriginalHostFromHeaders(makeHeaders({ host: lambdaHost }))).toBe(lambdaHost);
  });

  test("rejects lambda-like hosts that do not match the expected suffix", () => {
    expect(() =>
      getOriginalHostFromHeaders(makeHeaders({ host: "abc123.lambda-url.us-east-1.on.aws" }))
    ).toThrow("Untrusted host header");
  });
});
