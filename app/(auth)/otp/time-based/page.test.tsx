import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkAuthenticationLevel } from "@lib/server/route-protection";

import Page from "./page";

vi.mock("@lib/server/route-protection", () => ({
  AuthLevel: {
    PASSWORD_REQUIRED: "password_required",
  },
  checkAuthenticationLevel: vi.fn(),
}));

vi.mock("@components/auth/AuthPanel", () => ({
  AuthPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@components/mfa/MfaUnavailableCta", () => ({
  MfaUnavailableCta: () => <div data-testid="mfa-unavailable-cta">mfa-unavailable-cta</div>,
}));

vi.mock("@root/app/(auth)/otp/time-based/components/LoginTOTP", () => ({
  LoginTOTP: () => <div>login-totp</div>,
}));

describe("otp/time-based page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAuthenticationLevel).mockResolvedValue({
      factors: { user: { id: "user-123", loginName: "person@canada.ca", displayName: "Person" } },
      expirationDate: undefined,
    } as never);
  });

  it("renders the authentication app step and the mfa unavailable call to action", async () => {
    const view = await Page({ searchParams: Promise.resolve({ requestId: "request_12345" }) });
    render(view);

    expect(screen.getByText("login-totp")).toBeInTheDocument();
    expect(screen.getByTestId("mfa-unavailable-cta")).toBeInTheDocument();
  });
});
