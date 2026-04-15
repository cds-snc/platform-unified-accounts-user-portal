/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { generateCSP } from "@lib/cspScripts";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { checkAuthenticationLevel, getSmartRedirect } from "./lib/server/route-protection";
import { getServiceUrlFromHeaders } from "./lib/service-url";
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
  getSmartRedirect: vi.fn(),
}));

vi.mock("./lib/service-url", () => ({
  getServiceUrlFromHeaders: vi.fn(() => ({ serviceUrl: "https://idp.example.com" })),
}));

vi.mock("./lib/middleware-config", () => ({
  API_ROUTES: ["/api", "/healthy", "/security", "/login", "/logout-session"],
  AUTH_FLOW_ROUTES: [
    "/password",
    "/password/reset",
    "/mfa",
    "/mfa/set",
    "/otp/time-based",
    "/otp/email",
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
    delete process.env.ZITADEL_API_URL;
    delete process.env.ZITADEL_SERVICE_USER_TOKEN;
  });

  describe("Content-Security-Policy headers", () => {
    it("sets CSP header on open route responses", async () => {
      const request = makeRequest("/");
      const response = await proxy(request);

      expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'self';");
    });

    it("sets CSP header on API route responses", async () => {
      const request = makeRequest("/healthy");
      const response = await proxy(request);

      expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'self';");
    });

    it("sets x-nonce request header for all routes", async () => {
      const request = makeRequest("/");
      const response = await proxy(request);

      expect(generateCSP).toHaveBeenCalledOnce();
      expect(response.headers.get("x-middleware-request-x-nonce")).toBe("test-nonce");
      expect(response.headers.get("x-middleware-override-headers")).toContain("x-nonce");
    });

    it("sets CSP on proxy path when multitenancy env vars are absent", async () => {
      const request = makeRequest("/oidc/v1/authorize");
      const response = await proxy(request);

      expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'self';");
    });

    it("sets CSP on proxy path when multitenancy env vars are present", async () => {
      process.env.ZITADEL_API_URL = "https://idp.example.com";
      process.env.ZITADEL_SERVICE_USER_TOKEN = "token";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ settings: null }),
      });

      const request = makeRequest("/oidc/v1/authorize");
      const response = await proxy(request);

      expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'self';");
    });

    it("sets CSP on satisfied auth route responses", async () => {
      vi.mocked(checkAuthenticationLevel).mockResolvedValue({ satisfied: true });

      const request = makeRequest("/password");
      const response = await proxy(request);

      expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'self';");
    });

    it("sets CSP on auth flow route when password is verified", async () => {
      vi.mocked(checkAuthenticationLevel).mockResolvedValue({
        satisfied: false,
        session: { factors: { password: { verifiedAt: {} } } } as never,
      });

      const request = makeRequest("/mfa");
      const response = await proxy(request);

      expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'self';");
    });
  });

  describe("proxy path (OIDC)", () => {
    it("rewrites to Zitadel when env vars are set", async () => {
      process.env.ZITADEL_API_URL = "https://idp.example.com";
      process.env.ZITADEL_SERVICE_USER_TOKEN = "token";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ settings: null }),
      });

      const request = makeRequest("/oauth/v2/token");
      const response = await proxy(request);

      expect(response.status).toBe(200);
    });

    it("skips rewrite when env vars are absent", async () => {
      const request = makeRequest("/oauth/v2/token");
      const response = await proxy(request);

      expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'self';");
    });

    it("modifies frame-ancestors when embedded iframe is enabled", async () => {
      process.env.ZITADEL_API_URL = "https://idp.example.com";
      process.env.ZITADEL_SERVICE_USER_TOKEN = "token";

      vi.mocked(generateCSP).mockReturnValue({
        csp: "default-src 'self'; frame-ancestors 'none';",
        nonce: "test-nonce",
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          settings: {
            embeddedIframe: {
              enabled: true,
              allowedOrigins: ["https://app.example.com"],
            },
          },
        }),
      });

      const request = makeRequest("/oidc/v1/authorize");
      const response = await proxy(request);

      expect(response.headers.get("Content-Security-Policy")).toContain(
        "frame-ancestors https://app.example.com;"
      );
    });
  });

  describe("auth checks", () => {
    it("redirects to login when auth check fails on protected route", async () => {
      vi.mocked(checkAuthenticationLevel).mockResolvedValue({
        satisfied: false,
        session: null,
        redirect: "/",
        reason: "No session found",
      });
      vi.mocked(getSmartRedirect).mockReturnValue("/");

      const request = makeRequest("/account");
      const response = await proxy(request);

      expect(response.status).toBe(307);
    });

    it("forwards x-zitadel-i18n-organization header on all requests", async () => {
      vi.mocked(checkAuthenticationLevel).mockResolvedValue({ satisfied: true });

      const request = makeRequest("/password");
      const response = await proxy(request);

      expect(getServiceUrlFromHeaders).toHaveBeenCalled();
      expect(response.headers.get("x-middleware-override-headers")).toContain(
        "x-zitadel-i18n-organization"
      );
      expect(response.headers.get("x-middleware-request-x-zitadel-i18n-organization")).toBe(
        "test-org"
      );
    });

    it("allows password route when session has user factor", async () => {
      vi.mocked(checkAuthenticationLevel).mockResolvedValue({
        satisfied: false,
        session: { factors: { user: { id: "u1" } } } as never,
      });

      const request = makeRequest("/password");
      const response = await proxy(request);

      expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'self';");
    });
  });
});
