import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { render, screen } from "@testing-library/react";
import { create } from "@zitadel/client";
import { SessionSchema } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionCredentials } from "@lib/cookies";
import { checkAuthenticationLevel, hasStrongMFA } from "@lib/server/route-protection";
import { getPasswordComplexitySettings } from "@lib/zitadel";

import Page from "./page";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@lib/cookies", () => ({
  getSessionCredentials: vi.fn(),
}));

vi.mock("@lib/service-url", () => ({
  getServiceUrlFromHeaders: vi.fn(),
}));

vi.mock("@lib/server/route-protection", () => ({
  AuthLevel: {
    PASSWORD_REQUIRED: "password_required",
  },
  checkAuthenticationLevel: vi.fn(),
  hasStrongMFA: vi.fn(),
}));

vi.mock("@lib/zitadel", () => ({
  getPasswordComplexitySettings: vi.fn(),
}));

vi.mock("@lib/logger", () => ({
  logMessage: {
    debug: vi.fn(),
  },
}));

vi.mock("@i18n/server", () => ({
  serverTranslation: vi.fn(() => ({
    t: (key: string) => key,
  })),
}));

vi.mock("@components/auth/AuthPanel", () => ({
  AuthPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("./components/ChangePasswordForm", () => ({
  ChangePasswordForm: ({ sessionId, loginName }: { sessionId: string; loginName: string }) => (
    <div>{`change-password-form:${sessionId}:${loginName}`}</div>
  ),
}));

const PageParams = {
  searchParams: Promise.resolve({ requestId: "request_12345" }),
};

describe("password/change page", () => {
  const strongMfaSession = create(SessionSchema, {
    id: "session-123",
    factors: {
      user: { id: "user-123", loginName: "person@canada.ca" },
      password: { verifiedAt: { seconds: BigInt(1), nanos: 0 } },
      totp: { verifiedAt: { seconds: BigInt(1), nanos: 0 } },
    },
  });

  const passwordOnlySession = create(SessionSchema, {
    id: "session-123",
    factors: {
      user: { id: "user-123", loginName: "person@canada.ca" },
      password: { verifiedAt: { seconds: BigInt(1), nanos: 0 } },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(headers).mockResolvedValue(new Headers());
    vi.mocked(getSessionCredentials).mockResolvedValue({
      sessionId: "session-123",
      loginName: "person@canada.ca",
    } as never);

    vi.mocked(checkAuthenticationLevel).mockResolvedValue({
      session: strongMfaSession,
    } as never);
    vi.mocked(hasStrongMFA).mockReturnValue(true);

    vi.mocked(getPasswordComplexitySettings).mockResolvedValue({} as never);

    vi.mocked(redirect).mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("redirects to strong MFA verification when only password is verified", async () => {
    vi.mocked(checkAuthenticationLevel).mockResolvedValue({
      session: passwordOnlySession,
    } as never);
    vi.mocked(hasStrongMFA).mockReturnValue(false);

    await expect(Page(PageParams)).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith("/password/change/verify?requestId=request_12345");
  });

  it("renders change password form when auth and session context are valid", async () => {
    const view = await Page(PageParams);
    render(view);

    expect(
      screen.getByText("change-password-form:session-123:person@canada.ca")
    ).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });
});
