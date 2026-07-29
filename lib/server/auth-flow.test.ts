import { mockRedirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loginWithOIDCAndSession } from "@lib/oidc";

import { completeFlowAndRedirect } from "./auth-flow";
import { loadSessionsWithCookies } from "./session";

/*--------------------------------------------*
 * Mock all dependencies
 *--------------------------------------------*/

vi.mock("@lib/logger", () => ({
  logMessage: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@lib/oidc", () => ({
  loginWithOIDCAndSession: vi.fn(),
}));

vi.mock("./session", () => ({
  loadSessionsWithCookies: vi.fn(),
}));

/*--------------------------------------------*
 * Helpers
 *--------------------------------------------*/

const SESSION_ID = "session-abc";
const OIDC_REQUEST_ID = "oidc_auth-request-123";
const NON_OIDC_REQUEST_ID = "saml_req-456";

function setupSessionMock() {
  vi.mocked(loadSessionsWithCookies).mockResolvedValue({
    sessions: [],
    sessionCookies: [],
  } as never);
}

/*--------------------------------------------*
 * Tests
 *--------------------------------------------*/

describe("completeFlowAndRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("non-OIDC flows", () => {
    it("redirects to defaultRedirectUri when no requestId is provided", async () => {
      await expect(
        completeFlowAndRedirect({ sessionId: SESSION_ID }, "/some/path")
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith("/some/path");
    });

    it("redirects to /account when no requestId and no defaultRedirectUri", async () => {
      await expect(completeFlowAndRedirect({ sessionId: SESSION_ID })).rejects.toThrow(
        "NEXT_REDIRECT"
      );

      expect(mockRedirect).toHaveBeenCalledWith("/account");
    });

    it("redirects to defaultRedirectUri when requestId does not start with oidc_", async () => {
      await expect(
        completeFlowAndRedirect(
          { sessionId: SESSION_ID, requestId: NON_OIDC_REQUEST_ID },
          "/some/path"
        )
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith("/some/path");
    });

    it("redirects to /account with requestId query param when no defaultRedirectUri and requestId is non-OIDC", async () => {
      await expect(
        completeFlowAndRedirect({ sessionId: SESSION_ID, requestId: NON_OIDC_REQUEST_ID })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith(`/account?requestId=${NON_OIDC_REQUEST_ID}`);
    });
  });

  describe("OIDC flows — normal completion", () => {
    it("completes OIDC flow and redirects on success", async () => {
      setupSessionMock();
      vi.mocked(loginWithOIDCAndSession).mockResolvedValue({ redirect: "/callback" });

      await expect(
        completeFlowAndRedirect({ sessionId: SESSION_ID, requestId: OIDC_REQUEST_ID })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(loginWithOIDCAndSession).toHaveBeenCalledWith(
        expect.objectContaining({
          authRequest: "auth-request-123",
          sessionId: SESSION_ID,
        })
      );
      expect(mockRedirect).toHaveBeenCalledWith("/callback");
    });

    it("returns error when OIDC completion fails", async () => {
      setupSessionMock();
      vi.mocked(loginWithOIDCAndSession).mockResolvedValue({ error: "Auth failed" });

      const result = await completeFlowAndRedirect({
        sessionId: SESSION_ID,
        requestId: OIDC_REQUEST_ID,
      });

      expect(result).toEqual({ error: "Auth failed" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it("returns error when OIDC completion returns an unexpected result", async () => {
      setupSessionMock();
      vi.mocked(loginWithOIDCAndSession).mockResolvedValue(null as never);

      const result = await completeFlowAndRedirect({
        sessionId: SESSION_ID,
        requestId: OIDC_REQUEST_ID,
      });

      expect(result).toEqual({ error: "Authentication completed but navigation failed" });
    });
  });

  describe("OIDC flows — deferred completion (shouldDeferOIDCCompletion)", () => {
    it("defers OIDC completion and redirects to /password/reset/set with requestId", async () => {
      const redirectUri = "/password/reset/set";

      await expect(
        completeFlowAndRedirect({ sessionId: SESSION_ID, requestId: OIDC_REQUEST_ID }, redirectUri)
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith(`/password/reset/set?requestId=${OIDC_REQUEST_ID}`);
      expect(loginWithOIDCAndSession).not.toHaveBeenCalled();
    });

    it("defers OIDC completion for /password/reset/set with a sub-path", async () => {
      const redirectUri = "/password/reset/set/extra";

      await expect(
        completeFlowAndRedirect({ sessionId: SESSION_ID, requestId: OIDC_REQUEST_ID }, redirectUri)
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith(
        `/password/reset/set/extra?requestId=${OIDC_REQUEST_ID}`
      );
      expect(loginWithOIDCAndSession).not.toHaveBeenCalled();
    });

    it("does NOT defer for a path that merely contains /password/reset/set", async () => {
      setupSessionMock();
      vi.mocked(loginWithOIDCAndSession).mockResolvedValue({ redirect: "/callback" });

      // Path starts with /other — no deferral should occur
      await expect(
        completeFlowAndRedirect(
          { sessionId: SESSION_ID, requestId: OIDC_REQUEST_ID },
          "/other/password/reset/set"
        )
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(loginWithOIDCAndSession).toHaveBeenCalled();
    });

    it("does NOT defer when defaultRedirectUri is absent", async () => {
      setupSessionMock();
      vi.mocked(loginWithOIDCAndSession).mockResolvedValue({ redirect: "/callback" });

      await expect(
        completeFlowAndRedirect({ sessionId: SESSION_ID, requestId: OIDC_REQUEST_ID })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(loginWithOIDCAndSession).toHaveBeenCalled();
    });

    it("does NOT defer for an unrelated OIDC redirect path", async () => {
      setupSessionMock();
      vi.mocked(loginWithOIDCAndSession).mockResolvedValue({ redirect: "/callback" });

      await expect(
        completeFlowAndRedirect({ sessionId: SESSION_ID, requestId: OIDC_REQUEST_ID }, "/account")
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(loginWithOIDCAndSession).toHaveBeenCalled();
      expect(mockRedirect).toHaveBeenCalledWith("/callback");
    });
  });
});
