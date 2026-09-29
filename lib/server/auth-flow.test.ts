import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockRedirect } from "@root/test/mocks/next/navigation";
import { loginWithOIDCAndSession } from "@lib/oidc";

import { completeFlowAndRedirect } from "./auth-flow";
import { checkSessionFactors } from "./route-protection";
import { getSessionWithCookie } from "./session";

/*--------------------------------------------*
 * Mock all dependencies
 *--------------------------------------------*/

vi.mock("@lib/logger", () => ({
  logMessage: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@lib/oidc", () => ({
  loginWithOIDCAndSession: vi.fn(),
}));

vi.mock("@lib/session", () => ({
  loadActiveSession: vi.fn().mockResolvedValue(null),
}));

vi.mock("./route-protection", () => ({
  checkSessionFactors: vi.fn(),
}));

vi.mock("./session", () => ({
  getSessionWithCookie: vi.fn(),
}));

/*--------------------------------------------*
 * Helpers
 *--------------------------------------------*/

const SESSION_ID = "session-abc";
const OIDC_REQUEST_ID = "oidc_auth-request-123";
const NON_OIDC_REQUEST_ID = "saml_req-456";

function setupFactorsMock() {
  vi.mocked(checkSessionFactors).mockReturnValue({
    hasUser: true,
    notExpired: true,
    passwordVerified: true,
    totpVerified: true,
    u2fVerified: true,
    emailVerified: true,
  });
}

function setupSessionMock() {
  vi.mocked(getSessionWithCookie).mockResolvedValue({
    session: undefined,
    cookie: undefined,
  } as never);
}

/*--------------------------------------------*
 * Tests
 *--------------------------------------------*/

describe("completeFlowAndRedirect", () => {
  describe("non-OIDC flows", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      setupFactorsMock();
    });
    it("redirects to /account when no requestId is provided", async () => {
      await expect(completeFlowAndRedirect({ sessionId: SESSION_ID })).rejects.toThrow(
        "NEXT_REDIRECT"
      );

      expect(mockRedirect).toHaveBeenCalledWith("/account");
    });

    it("redirects to /account when requestId does not start with oidc_", async () => {
      await expect(
        completeFlowAndRedirect({ sessionId: SESSION_ID, requestId: NON_OIDC_REQUEST_ID })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith("/account");
    });
  });

  describe("OIDC flows — normal completion", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      setupSessionMock();
      setupFactorsMock();
    });
    it("completes OIDC flow and redirects on success", async () => {
      vi.mocked(loginWithOIDCAndSession).mockResolvedValue({ redirect: "/callback" });

      await expect(
        completeFlowAndRedirect({ sessionId: SESSION_ID, requestId: OIDC_REQUEST_ID })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(loginWithOIDCAndSession).toHaveBeenCalledWith(
        expect.objectContaining({
          authRequest: "auth-request-123",
          cookie: undefined,
          session: undefined,
        })
      );
      expect(mockRedirect).toHaveBeenCalledWith("/callback");
    });

    it("returns error when OIDC completion fails", async () => {
      vi.mocked(loginWithOIDCAndSession).mockResolvedValue({ error: "Auth failed" });

      const result = await completeFlowAndRedirect({
        sessionId: SESSION_ID,
        requestId: OIDC_REQUEST_ID,
      });

      expect(result).toEqual({ error: "Auth failed" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("returns error when OIDC completion returns an unexpected result", async () => {
      vi.mocked(loginWithOIDCAndSession).mockResolvedValue(null as never);

      const result = await completeFlowAndRedirect({
        sessionId: SESSION_ID,
        requestId: OIDC_REQUEST_ID,
      });

      expect(result).toEqual({ error: "Authentication completed but navigation failed" });
    });
  });

  describe("OIDC flows — deferred completion (shouldDeferOIDCCompletion)", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      setupSessionMock();
    });
    it("defers OIDC completion and redirects to /password/reset/set with requestId", async () => {
      vi.mocked(checkSessionFactors).mockReturnValue({
        hasUser: true,
        notExpired: true,
        passwordVerified: false,
        totpVerified: true,
        u2fVerified: false,
        emailVerified: true,
      });

      await expect(
        completeFlowAndRedirect({ sessionId: SESSION_ID, requestId: OIDC_REQUEST_ID })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith(`/password/reset/set?requestId=${OIDC_REQUEST_ID}`);
      expect(loginWithOIDCAndSession).not.toHaveBeenCalled();
    });

    it("does NOT defer for an unrelated OIDC redirect path", async () => {
      vi.mocked(loginWithOIDCAndSession).mockResolvedValue({ redirect: "/callback" });
      vi.mocked(checkSessionFactors).mockReturnValue({
        hasUser: true,
        notExpired: true,
        passwordVerified: true,
        totpVerified: true,
        u2fVerified: false,
        emailVerified: true,
      });

      await expect(
        completeFlowAndRedirect({ sessionId: SESSION_ID, requestId: OIDC_REQUEST_ID })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(loginWithOIDCAndSession).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith("/callback");
    });
  });
});
