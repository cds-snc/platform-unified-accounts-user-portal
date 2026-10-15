import { useRouter } from "next/navigation";
import { fireEvent, render, screen } from "@testing-library/react";
import { create } from "@zitadel/client";
import {
  FactorsSchema,
  SessionSchema,
  UserFactorSchema,
} from "@zitadel/proto/zitadel/session/v2/session_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkAuthenticationLevel } from "@lib/server/route-protection";

import Page from "./page";

vi.mock("@lib/server/route-protection", () => ({
  AuthLevel: { MFA_CHANGE_REQUIRED: "mfa_change_required" },
  checkAuthenticationLevel: vi.fn(),
}));

vi.mock("@i18n/client", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@components/auth/AuthPanel", () => ({
  AuthPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const session = {
  ...create(SessionSchema),
  factors: {
    ...create(FactorsSchema),
    user: create(UserFactorSchema, { id: "user-123" }),
  },
  authMethods: [AuthenticationMethodType.PASSWORD],
  emailVerified: true,
  phoneVerified: false,
};

const props = { searchParams: Promise.resolve({ requestId: "request-123" }) };

describe("MFA setup page", () => {
  const push = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAuthenticationLevel).mockResolvedValue(session);
    vi.mocked(useRouter).mockReturnValue({
      bfcacheId: "test-cache",
      push,
      replace: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    });
  });

  it("hides the authenticator option for configured TOTP users but allows adding security keys", async () => {
    vi.mocked(checkAuthenticationLevel).mockResolvedValue({
      ...session,
      authMethods: [AuthenticationMethodType.TOTP, AuthenticationMethodType.U2F],
    });

    render(await Page(props));

    expect(screen.queryByTestId("mfa-setup-authenticator")).not.toBeInTheDocument();
    expect(screen.getByTestId("mfa-setup-continue")).toBeDisabled();

    fireEvent.click(screen.getByTestId("mfa-setup-security-key"));
    fireEvent.click(screen.getByTestId("mfa-setup-continue"));

    expect(push).toHaveBeenCalledWith("/u2f/set?requestId=request-123&checkAfter=true");
  });

  it.each([[AuthenticationMethodType.PASSWORD], [AuthenticationMethodType.U2F]])(
    "allows authenticator setup without existing TOTP (%s)",
    async (method) => {
      vi.mocked(checkAuthenticationLevel).mockResolvedValue({
        ...session,
        authMethods: [method],
      });

      render(await Page(props));

      fireEvent.click(screen.getByTestId("mfa-setup-authenticator"));
      fireEvent.click(screen.getByTestId("mfa-setup-continue"));

      expect(push).toHaveBeenCalledWith(
        "/otp/time-based/set?requestId=request-123&checkAfter=true"
      );
    }
  );
});
