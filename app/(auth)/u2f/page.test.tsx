import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkAuthenticationLevel } from "@lib/server/route-protection";

import Page from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@lib/logger", () => ({
  logMessage: {
    debug: vi.fn(),
  },
}));

vi.mock("@lib/server/route-protection", () => ({
  AuthLevel: {
    PASSWORD_REQUIRED: "password_required",
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

vi.mock("./components/LoginU2F", () => ({
  LoginU2F: () => <div>login-u2f</div>,
}));

describe("u2f page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAuthenticationLevel).mockResolvedValue({
      factors: { user: { id: "user-123", loginName: "person@canada.ca", displayName: "Person" } },
    } as never);
  });

  it("renders the security key verification and the mfa unavailable call to action", async () => {
    const view = await Page({ searchParams: Promise.resolve({ requestId: "request_12345" }) });
    render(view);

    expect(screen.getByText("login-u2f")).toBeInTheDocument();
    expect(screen.getByTestId("mfa-unavailable-cta")).toBeInTheDocument();
  });
});
