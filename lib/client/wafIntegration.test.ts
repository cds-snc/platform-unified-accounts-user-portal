import { afterEach, describe, expect, it, vi } from "vitest";

import { getWafToken, isWafIntegrationEnabled } from "./wafIntegration";

describe("isWafIntegrationEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false when NEXT_PUBLIC_WAF_INTEGRATION_URL is not set", () => {
    vi.stubEnv("NEXT_PUBLIC_WAF_INTEGRATION_URL", "");

    expect(isWafIntegrationEnabled()).toBe(false);
  });

  it("returns true when NEXT_PUBLIC_WAF_INTEGRATION_URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_WAF_INTEGRATION_URL", "https://example.com/waf");

    expect(isWafIntegrationEnabled()).toBe(true);
  });
});

describe("getWafToken", () => {
  afterEach(() => {
    delete window.AwsWafIntegration;
  });

  it("rejects when the AWS WAF SDK has not loaded", async () => {
    delete window.AwsWafIntegration;

    await expect(getWafToken()).rejects.toThrow("AWS WAF SDK not loaded");
  });

  it("resolves with the token when the SDK resolves", async () => {
    window.AwsWafIntegration = {
      getToken: vi.fn().mockResolvedValue("test-token"),
      hasToken: vi.fn(),
      fetch: vi.fn(),
    };

    await expect(getWafToken()).resolves.toBe("test-token");
  });

  it("propagates rejection when the SDK's getToken rejects", async () => {
    window.AwsWafIntegration = {
      getToken: vi.fn().mockRejectedValue(new Error("timeout")),
      hasToken: vi.fn(),
      fetch: vi.fn(),
    };

    await expect(getWafToken()).rejects.toThrow("timeout");
  });
});
