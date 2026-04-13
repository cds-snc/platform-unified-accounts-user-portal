import { timestampDate } from "@zitadel/client";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadMostRecentSession } from "@lib/session";

import {
  AuthLevel,
  checkAuthenticationLevel,
  checkSessionFactors,
  getSmartRedirect,
  hasAnyMFA,
  hasStrongMFA,
  requiresStrongMfaSetupVerification,
} from "./route-protection";

vi.mock("@zitadel/client", () => ({
  timestampDate: vi.fn(),
}));

vi.mock("@lib/session", () => ({
  loadMostRecentSession: vi.fn(),
}));

vi.mock("@lib/logger", () => ({
  logMessage: {
    debug: vi.fn(),
  },
}));

describe("route-protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(timestampDate).mockReturnValue(new Date(Date.now() + 10_000));
  });

  it("returns all false factors when session is null", () => {
    expect(checkSessionFactors(null)).toEqual({
      hasUser: false,
      notExpired: false,
      passwordVerified: false,
      totpVerified: false,
      u2fVerified: false,
      otpEmailVerified: false,
      emailVerified: false,
    });
  });

  it("distinguishes any MFA from strong MFA", () => {
    const otpEmailSession = {
      factors: {
        user: { id: "user-123" },
        otpEmail: { verifiedAt: {} },
      },
    } as never;

    expect(hasAnyMFA(otpEmailSession)).toBe(true);
    expect(hasStrongMFA(otpEmailSession)).toBe(false);
  });

  it("requires strong MFA re-verification before MFA setup when a strong method is configured", () => {
    expect(
      requiresStrongMfaSetupVerification({
        authMethods: [AuthenticationMethodType.TOTP],
        factors: {
          user: { id: "user-123" },
          password: { verifiedAt: {} },
        },
      } as never)
    ).toBe(true);

    expect(
      requiresStrongMfaSetupVerification({
        authMethods: [AuthenticationMethodType.TOTP],
        factors: {
          user: { id: "user-123" },
          password: { verifiedAt: {} },
          totp: { verifiedAt: {} },
        },
      } as never)
    ).toBe(false);

    expect(
      requiresStrongMfaSetupVerification({
        authMethods: [],
        factors: {
          user: { id: "user-123" },
          password: { verifiedAt: {} },
        },
      } as never)
    ).toBe(false);
  });

  it("allows open routes without loading session", async () => {
    const result = await checkAuthenticationLevel("https://idp.example", AuthLevel.OPEN);

    expect(result).toEqual({ satisfied: true });
    expect(loadMostRecentSession).not.toHaveBeenCalled();
  });

  it("fails basic session level when no session exists", async () => {
    vi.mocked(loadMostRecentSession).mockResolvedValue(undefined as never);

    const result = await checkAuthenticationLevel(
      "https://idp.example",
      AuthLevel.BASIC_SESSION,
      "person@canada.ca",
      "org-1"
    );

    expect(result).toMatchObject({
      satisfied: false,
      redirect: "/",
      reason: "No session found",
    });
  });

  it("fails password-required level when password is not verified", async () => {
    vi.mocked(loadMostRecentSession).mockResolvedValue({
      factors: {
        user: { id: "user-123" },
      },
    } as never);

    const result = await checkAuthenticationLevel(
      "https://idp.example",
      AuthLevel.PASSWORD_REQUIRED
    );

    expect(result).toMatchObject({
      satisfied: false,
      redirect: "/password",
      reason: "Password not verified",
    });
  });

  it("satisfies any-mfa level with OTP email after password verification", async () => {
    vi.mocked(loadMostRecentSession).mockResolvedValue({
      factors: {
        user: { id: "user-123" },
        password: { verifiedAt: {} },
        otpEmail: { verifiedAt: {} },
      },
    } as never);

    const result = await checkAuthenticationLevel(
      "https://idp.example",
      AuthLevel.ANY_MFA_REQUIRED
    );

    expect(result.satisfied).toBe(true);
  });

  it("fails strong-mfa level with OTP email only", async () => {
    vi.mocked(loadMostRecentSession).mockResolvedValue({
      factors: {
        user: { id: "user-123" },
        password: { verifiedAt: {} },
        otpEmail: { verifiedAt: {} },
      },
    } as never);

    const result = await checkAuthenticationLevel(
      "https://idp.example",
      AuthLevel.STRONG_MFA_REQUIRED
    );

    expect(result).toMatchObject({
      satisfied: false,
      redirect: "/mfa",
      reason: "Strong MFA not verified",
    });
  });

  it("builds smart redirect URLs based on factors and preserves requestId", () => {
    const params = new URLSearchParams("requestId=req-123");

    expect(getSmartRedirect("/account", null, params)).toBe("/?requestId=req-123");

    const noPasswordSession = {
      factors: {
        user: { id: "user-123" },
      },
    } as never;
    expect(getSmartRedirect("/account", noPasswordSession, params)).toBe(
      "/password?requestId=req-123"
    );

    const noStrongMfaSession = {
      factors: {
        user: { id: "user-123" },
        password: { verifiedAt: {} },
        otpEmail: { verifiedAt: {} },
      },
    } as never;
    expect(getSmartRedirect("/account", noStrongMfaSession, params)).toBe("/mfa?requestId=req-123");

    const strongMfaSession = {
      factors: {
        user: { id: "user-123" },
        password: { verifiedAt: {} },
        totp: { verifiedAt: {} },
      },
    } as never;
    expect(getSmartRedirect("/account", strongMfaSession, params)).toBe("/account");
  });
});
