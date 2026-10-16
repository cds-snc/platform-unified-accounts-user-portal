import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockRedirect } from "@root/test/mocks/next/navigation";
import { loginWithOIDCAndSession } from "@lib/oidc";
import { loadActiveSession } from "@lib/session";

import { completeFlowAndRedirect, handleAbandonedRegistrationFlow } from "./auth-flow";
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

function setupActiveSessionMock(authMethods: AuthenticationMethodType[]) {
  vi.mocked(loadActiveSession).mockResolvedValue({ authMethods } as never);
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

describe("handleAbandonedRegistrationFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFactorsMock();
    setupActiveSessionMock([]);
  });

  it("throws when the session has no user", async () => {
    vi.mocked(checkSessionFactors).mockReturnValue({
      hasUser: false,
      notExpired: true,
      passwordVerified: false,
      totpVerified: false,
      u2fVerified: false,
      emailVerified: false,
    });

    await expect(handleAbandonedRegistrationFlow()).rejects.toThrow("No user on the session");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects to incomplete registration when email is unverified", async () => {
    vi.mocked(checkSessionFactors).mockReturnValue({
      hasUser: true,
      notExpired: true,
      passwordVerified: false,
      totpVerified: false,
      u2fVerified: false,
      emailVerified: false,
    });
    setupActiveSessionMock([AuthenticationMethodType.TOTP]);

    await expect(handleAbandonedRegistrationFlow(OIDC_REQUEST_ID)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(`/register/incomplete?requestId=${OIDC_REQUEST_ID}`);
  });

  it("redirects to incomplete registration when no strong MFA is configured", async () => {
    await expect(handleAbandonedRegistrationFlow()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/register/incomplete");
  });

  it.each([AuthenticationMethodType.TOTP, AuthenticationMethodType.U2F])(
    "does not redirect when email is verified and %s is configured",
    async (authMethod) => {
      setupActiveSessionMock([authMethod]);

      await expect(handleAbandonedRegistrationFlow()).resolves.toBeUndefined();
      expect(mockRedirect).not.toHaveBeenCalled();
    }
  );
});
