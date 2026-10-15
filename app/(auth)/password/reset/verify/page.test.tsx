import { redirect } from "next/navigation";
import { render, screen } from "@testing-library/react";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkAuthenticationLevel } from "@lib/server/route-protection";

import Page from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@lib/logger", () => ({
  logMessage: {
    info: vi.fn(),
  },
}));

vi.mock("@lib/server/route-protection", () => ({
  AuthLevel: {
    BASIC_SESSION: "basic_session",
  },
  checkAuthenticationLevel: vi.fn(),
}));

vi.mock("@components/auth/AuthPanel", () => ({
  AuthPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@components/mfa/StrongFactorSelection", () => ({
  StrongFactorSelection: () => <div>strong-factor-selection</div>,
}));

vi.mock("@components/mfa/MfaUnavailableCta", () => ({
  MfaUnavailableCta: () => <div data-testid="mfa-unavailable-cta">mfa-unavailable-cta</div>,
}));

describe("password/reset/verify page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the factor selection and the mfa unavailable call to action", async () => {
    vi.mocked(checkAuthenticationLevel).mockResolvedValue({
      authMethods: [AuthenticationMethodType.TOTP, AuthenticationMethodType.U2F],
    } as never);

    const view = await Page({ searchParams: Promise.resolve({ requestId: "request_12345" }) });
    render(view);

    expect(screen.getByText("strong-factor-selection")).toBeInTheDocument();
    expect(screen.getByTestId("mfa-unavailable-cta")).toBeInTheDocument();
  });

  it("redirects when the user has no strong MFA method", async () => {
    vi.mocked(checkAuthenticationLevel).mockResolvedValue({ authMethods: [] } as never);

    await Page({ searchParams: Promise.resolve({ requestId: "request_12345" }) });

    expect(redirect).toHaveBeenCalledWith(expect.stringContaining("/contact-us"));
    expect(redirect).not.toHaveBeenCalledWith(expect.stringContaining("/password/contact-us"));
  });
});
