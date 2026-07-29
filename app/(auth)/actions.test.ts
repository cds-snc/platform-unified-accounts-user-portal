import { mockRedirect } from "next/navigation";
import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionCookieById } from "@lib/cookies";
import { loginWithOIDCAndSession } from "@lib/oidc";
import { createSessionAndUpdateCookie } from "@lib/server/cookie";
import { validateUsernameAndPassword } from "@lib/validation/validationSchemas";
import {
  checkEmailVerification,
  checkMFAFactors,
  checkPasswordChangeRequired,
} from "@lib/verify-helper";
import {
  getLockoutSettings,
  getLoginSettings,
  getSession,
  getUserByID,
  listAuthenticationMethodTypes,
} from "@lib/zitadel";

import { setupServerActionContext } from "../../test/helpers/serverAction";

import { continueOidcSessionSelection, submitLoginForm } from "./actions";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("@zitadel/client", () => ({
  create: vi.fn(),
}));

vi.mock("@lib/server/cookie", () => ({
  createSessionAndUpdateCookie: vi.fn(),
  CreateSessionFailedError: class CreateSessionFailedError extends Error {},
}));

vi.mock("@lib/cookies", () => ({
  getSessionCookieById: vi.fn(),
  setSelectedSession: vi.fn(),
}));

vi.mock("@lib/oidc", () => ({
  loginWithOIDCAndSession: vi.fn(),
}));

vi.mock("@lib/service-url", () => ({
  getServiceUrlFromHeaders: vi.fn(),
}));

vi.mock("@lib/validation/validationSchemas", () => ({
  validateUsernameAndPassword: vi.fn(),
}));

vi.mock("@lib/verify-helper", () => ({
  checkEmailVerification: vi.fn(),
  checkMFAFactors: vi.fn(),
  checkPasswordChangeRequired: vi.fn(),
}));

vi.mock("@lib/zitadel", () => ({
  getLockoutSettings: vi.fn(),
  getLoginSettings: vi.fn(),
  getSession: vi.fn(),
  getUserByID: vi.fn(),
  listAuthenticationMethodTypes: vi.fn(),
}));

vi.mock("@i18n/server", () => ({
  serverTranslation: vi.fn(),
}));

vi.mock("@lib/logger", () => ({
  logMessage: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("submitLoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    setupServerActionContext();

    vi.mocked(validateUsernameAndPassword).mockResolvedValue({ success: true } as never);
    vi.mocked(getLoginSettings).mockResolvedValue({} as never);

    vi.mocked(create).mockReturnValue({ checks: "value" } as never);
    vi.mocked(createSessionAndUpdateCookie).mockResolvedValue({
      factors: {
        user: {
          id: "user-123",
        },
      },
    } as never);

    vi.mocked(getUserByID).mockResolvedValue({
      user: {
        state: UserState.ACTIVE,
        type: {
          case: "human",
          value: {},
        },
      },
    } as never);

    vi.mocked(checkEmailVerification).mockReturnValue(undefined);
    vi.mocked(listAuthenticationMethodTypes).mockResolvedValue({
      authMethodTypes: [{ type: "password" }],
    } as never);
    vi.mocked(checkMFAFactors).mockResolvedValue({} as never);
    vi.mocked(getLockoutSettings).mockResolvedValue({ maxPasswordAttempts: BigInt(5) } as never);
    vi.mocked(checkPasswordChangeRequired).mockResolvedValue(undefined);
  });

  it("returns generic error when validation fails", async () => {
    vi.mocked(validateUsernameAndPassword).mockResolvedValue({ success: false } as never);

    const response = await submitLoginForm({
      username: "",
      password: "",
    });

    expect(response).toEqual({ error: "translated:validation.invalidCredentials" });
    expect(getLoginSettings).not.toHaveBeenCalled();
    expect(createSessionAndUpdateCookie).not.toHaveBeenCalled();
  });

  it("returns generic error when session creation fails", async () => {
    vi.mocked(createSessionAndUpdateCookie).mockRejectedValue({ failedAttempts: BigInt(1) });

    const response = await submitLoginForm({
      username: "person@canada.ca",
      password: "P@ssw0rd",
    });

    expect(response).toEqual({ error: "translated:validation.invalidCredentials" });
  });

  it("returns generic error when session has no user id", async () => {
    vi.mocked(createSessionAndUpdateCookie).mockResolvedValue({} as never);

    const response = await submitLoginForm({
      username: "person@canada.ca",
      password: "P@ssw0rd",
    });

    expect(response).toEqual({ error: "translated:validation.invalidCredentials" });
  });

  it("returns generic error when authenticated user cannot be loaded", async () => {
    vi.mocked(getUserByID).mockResolvedValue({ user: undefined } as never);

    const response = await submitLoginForm({
      username: "person@canada.ca",
      password: "P@ssw0rd",
    });

    expect(response).toEqual({ error: "translated:validation.invalidCredentials" });
  });

  it("returns generic error when user is in INITIAL state", async () => {
    vi.mocked(getUserByID).mockResolvedValue({
      user: {
        state: UserState.INITIAL,
        type: {
          case: "human",
          value: {},
        },
      },
    } as never);

    const response = await submitLoginForm({
      username: "person@canada.ca",
      password: "P@ssw0rd",
    });

    expect(response).toEqual({ error: "translated:validation.invalidCredentials" });
  });

  it("returns email verification redirect when required", async () => {
    vi.mocked(checkEmailVerification).mockReturnValue({
      redirect: "/verify?requestId=req-123",
    });

    await expect(
      submitLoginForm({
        username: "person@canada.ca",
        password: "P@ssw0rd",
        requestId: "req-123",
      })
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/verify?requestId=req-123");
  });

  it("returns generic error when no auth methods are available", async () => {
    vi.mocked(listAuthenticationMethodTypes).mockResolvedValue({ authMethodTypes: [] } as never);

    const response = await submitLoginForm({
      username: "person@canada.ca",
      password: "P@ssw0rd",
    });

    expect(response).toEqual({ error: "translated:validation.invalidCredentials" });
  });

  it("returns MFA redirect when additional factor is required", async () => {
    vi.mocked(checkMFAFactors).mockResolvedValue({ redirect: "/mfa?requestId=req-123" } as never);

    await expect(
      submitLoginForm({
        username: "person@canada.ca",
        password: "P@ssw0rd",
        requestId: "req-123",
      })
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/mfa?requestId=req-123");
  });

  it("returns generic error when MFA factor check fails", async () => {
    vi.mocked(checkMFAFactors).mockResolvedValue({ error: "failed-precondition" } as never);

    const response = await submitLoginForm({
      username: "person@canada.ca",
      password: "P@ssw0rd",
      requestId: "req-123",
    });

    expect(response).toEqual({ error: "translated:validation.invalidCredentials" });
  });

  it("redirects to account when login is successful", async () => {
    const command = {
      username: "person@canada.ca",
      password: "P@ssw0rd",
      requestId: "req-123",
    };

    await expect(submitLoginForm(command)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/account?requestId=req-123");
    expect(create).toHaveBeenCalledWith(ChecksSchema, {
      user: { search: { case: "loginName", value: command.username } },
      password: { password: command.password },
    });
    expect(createSessionAndUpdateCookie).toHaveBeenCalledWith({
      checks: { checks: "value" },
      requestId: command.requestId,
    });
  });

  it("completes OIDC callback when a valid stored session is selected", async () => {
    vi.mocked(getSessionCookieById).mockResolvedValue({
      id: "session-123",
      token: "token-123",
      loginName: "person@canada.ca",
      displayName: "Person",
      userId: "user-123",
      creationTs: "1",
      expirationTs: "2",
      changeTs: "3",
    } as never);
    vi.mocked(getSession).mockResolvedValue({
      session: {
        id: "session-123",
        factors: {
          user: {
            id: "user-123",
            loginName: "person@canada.ca",
          },
        },
      },
    } as never);
    vi.mocked(loginWithOIDCAndSession).mockResolvedValue({
      redirect: "https://forms.example.ca/api/auth/callback/gcForms",
    } as never);

    const response = await continueOidcSessionSelection("session-123", "oidc_req-123");

    expect(getSessionCookieById).toHaveBeenCalledWith({ sessionId: "session-123" });
    expect(getSession).toHaveBeenCalledWith("session-123", "token-123");
    expect(loginWithOIDCAndSession).toHaveBeenCalledWith({
      authRequest: "oidc_req-123",
      sessionId: "session-123",
      sessions: [
        {
          id: "session-123",
          factors: {
            user: {
              id: "user-123",
              loginName: "person@canada.ca",
            },
          },
        },
      ],
      sessionCookies: [
        {
          id: "session-123",
          token: "token-123",
          loginName: "person@canada.ca",
          displayName: "Person",
          userId: "user-123",
          creationTs: "1",
          expirationTs: "2",
          changeTs: "3",
        },
      ],
    });
    expect(response).toEqual({
      redirect: "https://forms.example.ca/api/auth/callback/gcForms",
    });
  });
});
