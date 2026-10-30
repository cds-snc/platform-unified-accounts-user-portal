import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

describe("GET /healthy", () => {
  const requiredEnvVars = [
    "NOTIFY_API_KEY",
    "TEMPLATE_ID",
    "ZITADEL_API_URL",
    "ZITADEL_ORGANIZATION",
    "HCAPTCHA_SITE_KEY",
    "HCAPTCHA_SECRET",
    "PASSWORD_RESET_SECRET",
  ];
  const serviceUserTokenEnvVars = ["ZITADEL_SERVICE_USER_TOKEN", "ZITADEL_SERVICE_USER_TOKEN_FILE"];
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of [...requiredEnvVars, ...serviceUserTokenEnvVars]) {
      originalEnv[key] = process.env[key];
      process.env[key] = key === "ZITADEL_SERVICE_USER_TOKEN_FILE" ? "" : "test-value";
    }
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", "test-session-cookie-secret-at-least-32-chars");
    vi.stubEnv("PASSWORD_RESET_SECRET", "test-password-reset-secret-at-least-32-chars");
    vi.resetModules();
  });

  afterEach(() => {
    for (const key of [...requiredEnvVars, ...serviceUserTokenEnvVars]) {
      process.env[key] = originalEnv[key];
    }
    vi.unstubAllEnvs();
  });

  test("returns 200 when all required env vars are set", async () => {
    const { GET } = await import("./route");

    const response = await GET();
    expect(response.status).toBe(200);
  });

  test("returns 200 when the service token file path is set", async () => {
    process.env.ZITADEL_SERVICE_USER_TOKEN = "";
    process.env.ZITADEL_SERVICE_USER_TOKEN_FILE = "/run/secrets/zitadel-token";
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
    delete process.env.ZITADEL_SERVICE_USER_TOKEN_FILE;
    const { GET } = await import("./route");

    const response = await GET();
    expect(response.status).toBe(503);
  });

  test("returns 503 when the session cookie secret is not set", async () => {
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", undefined);
    const { GET } = await import("./route");

    const response = await GET();
    expect(response.status).toBe(503);
  });

  test("returns 503 when the session cookie secret is too short", async () => {
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", "too-short");
    const { GET } = await import("./route");

    const response = await GET();
    expect(response.status).toBe(503);
  });

  test("returns 503 when the password reset secret is not set", async () => {
    vi.stubEnv("PASSWORD_RESET_SECRET", undefined);
    const { GET } = await import("./route");

    const response = await GET();
    expect(response.status).toBe(503);
  });

  test.each([undefined, "too-short", `${"a".repeat(32)}, too-short`])(
    "returns 503 for invalid password reset secrets: %s",
    async (secret) => {
      vi.stubEnv("PASSWORD_RESET_SECRET", secret);
      const { GET } = await import("./route");

      expect((await GET()).status).toBe(503);
    }
  );
});
