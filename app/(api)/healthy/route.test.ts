import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("GET /healthy", () => {
  const requiredEnvVars = [
    "NOTIFY_API_KEY",
    "TEMPLATE_ID",
    "ZITADEL_API_URL",
    "ZITADEL_ORGANIZATION",
    "ZITADEL_SERVICE_USER_TOKEN",
  ];
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of requiredEnvVars) {
      originalEnv[key] = process.env[key];
      process.env[key] = "test-value";
    }
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of requiredEnvVars) {
      process.env[key] = originalEnv[key];
    }
  });

  test("returns 200 when all required env vars are set", async () => {
    const { GET } = await import("./route");

    const response = await GET();
    expect(response.status).toBe(200);
  });

  test("returns 503 when a required env var is missing", async () => {
    delete process.env.ZITADEL_ORGANIZATION;
    const { GET } = await import("./route");

    const response = await GET();
    expect(response.status).toBe(503);
  });

  test("returns 503 when a required env var is empty", async () => {
    process.env.NOTIFY_API_KEY = "";
    const { GET } = await import("./route");

    const response = await GET();
    expect(response.status).toBe(503);
  });

  test("returns 503 when multiple required env vars are missing", async () => {
    delete process.env.ZITADEL_API_URL;
    delete process.env.ZITADEL_SERVICE_USER_TOKEN;
    const { GET } = await import("./route");

    const response = await GET();
    expect(response.status).toBe(503);
  });
});
