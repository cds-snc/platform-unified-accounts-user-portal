import { afterEach, describe, expect, test } from "vitest";

import { getOriginalHostFromHeaders } from "./host";

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

  test.skip("rejects untrusted non-local hosts", () => {
    expect(() =>
      getOriginalHostFromHeaders({
        get: () => "attacker.example",
      })
    ).toThrow("Untrusted host header");
  });
});
