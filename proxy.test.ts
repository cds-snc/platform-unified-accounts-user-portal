/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { generateCSP } from "@lib/cspScripts";
import { logMessage } from "@lib/logger";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { proxy } from "./proxy";

vi.mock("@lib/cspScripts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lib/cspScripts")>();
  return {
    ...actual,
    generateCSP: vi.fn(() => ({ csp: "default-src 'self';", nonce: "test-nonce" })),
  };
});

vi.mock("@lib/logger", () => ({
  logMessage: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@root/constants/config", () => ({
  ZITADEL_ORGANIZATION: "test-org",
}));

vi.mock("./lib/server/route-protection", () => ({
  AuthLevel: {
    OPEN: "open",
    BASIC_SESSION: "basic_session",
    PASSWORD_REQUIRED: "password_required",
    ANY_MFA_REQUIRED: "any_mfa_required",
    STRONG_MFA_REQUIRED: "strong_mfa_required",
  },
  checkAuthenticationLevel: vi.fn(),
}));

vi.mock("./lib/service", () => ({
  getServiceForHost: vi.fn(),
}));

vi.mock("./lib/middleware-config", () => ({
  API_ROUTES: ["/api", "/healthy", "/security", "/version", "/login", "/logout-session"],
  AUTH_FLOW_ROUTES: [
    "/password",
    "/password/reset",
    "/mfa",
    "/mfa/set",
    "/otp/time-based",
    "/u2f",
    "/verify",
  ],
  getRequiredAuthLevel: vi.fn((pathname: string) => {
    if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/register")) {
      return "open";
    }
    if (pathname.startsWith("/account")) {
      return "any_mfa_required";
    }
    return "password_required";
  }),
  matchesPattern: vi.fn((pathname: string, patterns: string[]) =>
    patterns.some((p) => pathname === p || pathname.startsWith(p + "/"))
  ),
}));

function makeRequest(pathname: string, headers: Record<string, string> = {}): NextRequest {
  const url = `http://localhost:3000${pathname}`;
  return new NextRequest(url, {
    headers: { host: "localhost:3000", ...headers },
  });
}

describe("proxy middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(generateCSP).mockReturnValue({ csp: "default-src 'self';", nonce: "test-nonce" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("Content-Security-Policy headers", () => {
    it("sets CSP header on route responses", async () => {
      const request = makeRequest("/");
      const response = await proxy(request);

      expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'self';");
    });

    it("sets CSP header on API route responses", async () => {
      const request = makeRequest("/healthy");
      const response = await proxy(request);

      expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'self';");
    });

    it("allows the version endpoint to bypass auth redirects", async () => {
      const request = makeRequest("/version");
      const response = await proxy(request);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'self';");
    });

    it("sets x-nonce request header for all routes", async () => {
      const request = makeRequest("/");
      const response = await proxy(request);

      expect(generateCSP).toHaveBeenCalledOnce();
      expect(response.headers.get("x-middleware-request-x-nonce")).toBe("test-nonce");
      expect(response.headers.get("x-middleware-override-headers")).toContain("x-nonce");
    });
  });

  describe("Zitadel proxy headers", () => {
    it("forwards custom request headers to the Zitadel backend", async () => {
      vi.stubEnv("ZITADEL_API_URL", "https://zitadel.example.com");
      vi.stubEnv(
        "CUSTOM_REQUEST_HEADERS",
        "x-custom-header: custom-value,authorization:Bearer token:with:colons"
      );

      const response = await proxy(makeRequest("/.well-known/openid-configuration"));

      expect(response.headers.get("x-middleware-request-x-custom-header")).toBe("custom-value");
      expect(response.headers.get("x-middleware-request-authorization")).toBe(
        "Bearer token:with:colons"
      );
    });

    it("skips malformed custom request headers", async () => {
      vi.stubEnv("ZITADEL_API_URL", "https://zitadel.example.com");
      vi.stubEnv("CUSTOM_REQUEST_HEADERS", "malformed-header");

      await proxy(makeRequest("/.well-known/openid-configuration"));

      expect(logMessage.warn).toHaveBeenCalledWith(
        "Skipping malformed CUSTOM_REQUEST_HEADERS entry (expected key:value format)"
      );
    });
  });
});
