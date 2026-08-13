import { mockRedirect } from "next/navigation";
import { timestampDate } from "@zitadel/client";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkSessionFactorValidity, loadActiveSession } from "@lib/session";

import {
  AuthLevel,
  checkAuthenticationLevel,
  checkSessionFactors,
  hasAnyMFA,
  hasStrongMFA,
  requiresStrongMfaSetupVerification,
} from "./route-protection";

vi.mock("@zitadel/client", () => ({
  timestampDate: vi.fn(),
}));

vi.mock("@lib/session", () => ({
  loadMostRecentSession: vi.fn(),
  loadActiveSession: vi.fn(),
  checkSessionFactorValidity: vi.fn(),
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

  it("fails basic session level when no session exists", async () => {
    vi.mocked(loadActiveSession).mockResolvedValue(undefined as never);

    await expect(checkAuthenticationLevel(AuthLevel.BASIC_SESSION)).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("redirects when an invalid session is found ", async () => {
    vi.mocked(loadActiveSession).mockResolvedValue({
      factors: {
        user: { id: "user-123" },
      },
    } as never);
    vi.mocked(checkSessionFactorValidity).mockResolvedValue({ valid: false });

    await expect(checkAuthenticationLevel(AuthLevel.PASSWORD_REQUIRED)).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("fails password-required level when password is not verified", async () => {
    vi.mocked(loadActiveSession).mockResolvedValue({
      factors: {
        user: { id: "user-123" },
      },
    } as never);
    vi.mocked(checkSessionFactorValidity).mockReturnValue({ valid: true });

    await expect(checkAuthenticationLevel(AuthLevel.PASSWORD_REQUIRED)).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("redirects to verify when email verification is required but missing", async () => {
    vi.mocked(loadActiveSession).mockResolvedValue({
      factors: {
        user: { id: "user-123" },
        password: { verifiedAt: {} },
      },
      requestId: "req-123",
    } as never);
    vi.mocked(checkSessionFactorValidity).mockReturnValue({ valid: true });

    await expect(
      checkAuthenticationLevel(AuthLevel.PASSWORD_REQUIRED, undefined, {
        requireEmailVerified: true,
      })
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/verify?requestId=req-123");
  });

  it("satisfies any-mfa level after password verification", async () => {
    vi.mocked(loadActiveSession).mockResolvedValue({
      factors: {
        user: { id: "user-123" },
        password: { verifiedAt: {} },
        otpEmail: { verifiedAt: {} },
      },
    } as never);

    const result = await checkAuthenticationLevel(AuthLevel.ANY_MFA_REQUIRED);

    expect(result).not.toBe(null);
  });

  it("fails strong-mfa level", async () => {
    vi.mocked(loadActiveSession).mockResolvedValue({
      factors: {
        user: { id: "user-123" },
        password: { verifiedAt: {} },
        otpEmail: { verifiedAt: {} },
      },
    } as never);

    await expect(checkAuthenticationLevel(AuthLevel.STRONG_MFA_REQUIRED)).rejects.toThrow(
      "NEXT_REDIRECT"
    );
    expect(mockRedirect).toHaveBeenCalledWith("/mfa");
  });
});
