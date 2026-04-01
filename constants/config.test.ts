import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ALLOWED_ORG = "357256007820312901";
const DISALLOWED_ORG = "000000000000000001";

async function importConfig() {
  vi.resetModules();
  const mod = await import("./config");
  return mod;
}

describe("config ZITADEL_ORGANIZATION validation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.ZITADEL_ORGANIZATION;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws on startup when ZITADEL_ORGANIZATION is not in the allowlist", async () => {
    process.env.ZITADEL_ORGANIZATION = DISALLOWED_ORG;
    await expect(importConfig()).rejects.toThrow(/Invalid ZITADEL_ORGANIZATION/);
  });

  it("throws on startup when ZITADEL_ORGANIZATION is empty", async () => {
    process.env.ZITADEL_ORGANIZATION = "";
    await expect(importConfig()).rejects.toThrow(/Invalid ZITADEL_ORGANIZATION/);
  });

  it("does not throw when ZITADEL_ORGANIZATION is in the allowlist", async () => {
    process.env.ZITADEL_ORGANIZATION = ALLOWED_ORG;
    const { ZITADEL_ORGANIZATION } = await importConfig();
    expect(ZITADEL_ORGANIZATION).toBe(ALLOWED_ORG);
  });

  it("does not throw in development mode regardless of ZITADEL_ORGANIZATION", async () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.ZITADEL_ORGANIZATION = DISALLOWED_ORG;
    const { ZITADEL_ORGANIZATION } = await importConfig();
    expect(ZITADEL_ORGANIZATION).toBe(DISALLOWED_ORG);
  });

  it("does not throw in development mode when ZITADEL_ORGANIZATION is empty", async () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.ZITADEL_ORGANIZATION = "";
    const { ZITADEL_ORGANIZATION } = await importConfig();
    expect(ZITADEL_ORGANIZATION).toBe("");
  });
});
