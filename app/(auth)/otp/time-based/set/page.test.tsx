import { redirect } from "next/navigation";
import { Code, ConnectError } from "@connectrpc/connect";
import { render, screen } from "@testing-library/react";
import { create } from "@zitadel/client";
import {
  FactorsSchema,
  SessionSchema,
  UserFactorSchema,
} from "@zitadel/proto/zitadel/session/v2/session_pb";
import {
  AuthenticationMethodType,
  RegisterTOTPResponseSchema,
} from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkAuthenticationLevel } from "@lib/server/route-protection";
import { registerTOTP } from "@lib/zitadel";

import Page from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@lib/server/route-protection", () => ({
  AuthLevel: { MFA_CHANGE_REQUIRED: "mfa_change_required" },
  checkAuthenticationLevel: vi.fn(),
}));

vi.mock("@lib/zitadel", () => ({
  registerTOTP: vi.fn(),
}));

vi.mock("@lib/logger", () => ({
  logMessage: { debug: vi.fn() },
}));

vi.mock("@i18n", () => ({
  I18n: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}));

vi.mock("@i18n/client", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@i18n/server", () => ({
  serverTranslation: vi.fn(() => ({ t: (key: string) => key })),
}));

vi.mock("@components/auth/AuthPanel", () => ({
  AuthPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@components/account/user-avatar", () => ({
  UserAvatar: () => null,
}));

vi.mock("@components/ui/button/BackButton", () => ({
  BackButton: () => null,
}));

vi.mock("../components/TotpRegister", () => ({
  TotpRegister: ({ uri, secret }: { uri: string; secret: string }) => (
    <div data-testid="totp-register">
      {uri} {secret}
    </div>
  ),
}));

const session = {
  ...create(SessionSchema),
  factors: {
    ...create(FactorsSchema),
    user: create(UserFactorSchema, { id: "user-123", loginName: "person@canada.ca" }),
  },
  authMethods: [AuthenticationMethodType.PASSWORD],
  emailVerified: true,
  phoneVerified: false,
};

function pageProps(requestId?: string) {
  return {
    searchParams: Promise.resolve({ requestId, checkAfter: "true" }),
    params: Promise.resolve({}),
  };
}

describe("TOTP setup page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAuthenticationLevel).mockResolvedValue(session);
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    vi.mocked(registerTOTP).mockResolvedValue(
      create(RegisterTOTPResponseSchema, { uri: "otpauth://totp/test", secret: "test-secret" })
    );
  });

  it.each([undefined, "request-123"])(
    "redirects configured TOTP users without registering again (requestId: %s)",
    async (requestId) => {
      vi.mocked(checkAuthenticationLevel).mockResolvedValue({
        ...session,
        authMethods: [AuthenticationMethodType.TOTP],
      });

      await expect(Page(pageProps(requestId))).rejects.toThrow("NEXT_REDIRECT");

      expect(redirect).toHaveBeenCalledWith(
        requestId ? `/mfa/set?requestId=${requestId}` : "/mfa/set"
      );
      expect(registerTOTP).not.toHaveBeenCalled();
    }
  );

  it("redirects when Zitadel reports TOTP was already configured", async () => {
    vi.mocked(registerTOTP).mockRejectedValue(
      new ConnectError(
        "Multifactor OTP (OneTimePassword) is already set up (COMMAND-do9se)",
        Code.AlreadyExists
      )
    );

    await expect(Page(pageProps("request-123"))).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/mfa/set?requestId=request-123");
  });

  it("registers and renders setup for users without TOTP, including security-key users", async () => {
    vi.mocked(checkAuthenticationLevel).mockResolvedValue({
      ...session,
      authMethods: [AuthenticationMethodType.U2F],
    });

    render(await Page(pageProps()));

    expect(registerTOTP).toHaveBeenCalledWith({ userId: "user-123" });
    expect(screen.getByTestId("totp-register")).toHaveTextContent("test-secret");
    expect(redirect).not.toHaveBeenCalled();
  });

  it("still displays unrelated registration errors without redirecting", async () => {
    vi.mocked(registerTOTP).mockRejectedValue(
      new ConnectError("Service unavailable", Code.Unavailable)
    );

    render(await Page(pageProps()));

    expect(screen.getByTestId("alert-body")).toHaveTextContent("set.genericError");
    expect(screen.getByTestId("totp-setup-continue")).toBeDisabled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
