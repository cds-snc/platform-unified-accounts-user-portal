import { redirect } from "next/navigation";
import { render, screen } from "@testing-library/react";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkAuthenticationLevel } from "@lib/server/route-protection";

import Page from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@lib/server/route-protection", () => ({
  AuthLevel: {
    BASIC_SESSION: "basic_session",
  },
  checkAuthenticationLevel: vi.fn(),
}));

vi.mock("@components/account/user-avatar", () => ({
  UserAvatar: () => <div>user-avatar</div>,
}));

vi.mock("@components/auth/AuthPanel", () => ({
  AuthPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@components/mfa/MfaUnavailableCta", () => ({
  MfaUnavailableCta: () => <div data-testid="mfa-unavailable-cta">mfa-unavailable-cta</div>,
}));

vi.mock("@root/app/(auth)/u2f/components/LoginU2F", () => ({
  LoginU2F: () => <div>login-u2f</div>,
}));

describe("password/reset/verify/u2f page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the security key step and the mfa unavailable call to action", async () => {
    vi.mocked(checkAuthenticationLevel).mockResolvedValue({
      authMethods: [AuthenticationMethodType.U2F],
      factors: { user: { loginName: "person@canada.ca", displayName: "Person" } },
    } as never);

    const view = await Page({ searchParams: Promise.resolve({ requestId: "request_12345" }) });
    render(view);

    expect(screen.getByText("login-u2f")).toBeInTheDocument();
    expect(screen.getByTestId("mfa-unavailable-cta")).toBeInTheDocument();
  });

  it("redirects back to factor selection when the user has no security key", async () => {
    vi.mocked(checkAuthenticationLevel).mockResolvedValue({ authMethods: [] } as never);

    await Page({ searchParams: Promise.resolve({ requestId: "request_12345" }) });

    expect(redirect).toHaveBeenCalledWith("/password/reset/verify");
  });
});
