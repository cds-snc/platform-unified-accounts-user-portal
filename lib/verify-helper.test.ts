import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkEmailVerification } from "./verify-helper";

describe("checkEmailVerification", () => {
  const originalEmailVerification = process.env.EMAIL_VERIFICATION;

  afterEach(() => {
    process.env.EMAIL_VERIFICATION = originalEmailVerification;
    vi.resetModules();
    vi.doUnmock("@root/constants/config");
  });

  it("preserves user and organization context for verify redirects", () => {
    process.env.EMAIL_VERIFICATION = "true";

    const redirect = checkEmailVerification(
      {
        factors: {
          user: {
            id: "user-123",
            loginName: "person@canada.ca",
            organizationId: "org-1",
          },
        },
      } as never,
      {
        email: {
          isVerified: false,
        },
      } as never,
      "org-1",
      "oidc_req-123"
    );

    expect(redirect).toEqual({
      redirect: "/verify?requestId=oidc_req-123&userId=user-123&send=true&organization=org-1",
    });
  });
});

describe("checkMFAFactors", () => {
  it("redirects directly to TOTP when email OTP is disabled", async () => {
    vi.resetModules();
    vi.doMock("@root/constants/config", () => ({
      ENABLE_EMAIL_OTP: false,
      LOGGED_IN_HOME_PAGE: "/account",
      ZITADEL_ORGANIZATION: "",
    }));

    const { checkMFAFactors } = await import("./verify-helper");

    const result = await checkMFAFactors(
      "https://service.example",
      {} as never,
      undefined,
      [AuthenticationMethodType.TOTP, AuthenticationMethodType.OTP_EMAIL],
      "req-123"
    );

    expect(result).toEqual({ redirect: "/otp/time-based?requestId=req-123" });
  });

  it("shows MFA selection when email OTP is enabled", async () => {
    vi.resetModules();
    vi.doMock("@root/constants/config", () => ({
      ENABLE_EMAIL_OTP: true,
      LOGGED_IN_HOME_PAGE: "/account",
      ZITADEL_ORGANIZATION: "",
    }));

    const { checkMFAFactors } = await import("./verify-helper");

    const result = await checkMFAFactors(
      "https://service.example",
      {} as never,
      undefined,
      [AuthenticationMethodType.TOTP, AuthenticationMethodType.OTP_EMAIL],
      "req-123"
    );

    expect(result).toEqual({ redirect: "/mfa?requestId=req-123" });
  });
});
