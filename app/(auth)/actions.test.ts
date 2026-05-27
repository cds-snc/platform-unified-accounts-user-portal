import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateUsernameAndPassword } from "@lib/client/validationSchemas";
import { createSessionAndUpdateCookie } from "@lib/server/cookie";
import { checkEmailVerification, checkMFAFactors } from "@lib/verify-helper";
import {
  getLockoutSettings,
  getLoginSettings,
  getUserByID,
  listAuthenticationMethodTypes,
} from "@lib/zitadel";

import { setupServerActionContext } from "../../test/helpers/serverAction";

import { submitLoginForm } from "./actions";

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

vi.mock("@lib/service-url", () => ({
  getServiceUrlFromHeaders: vi.fn(),
}));

vi.mock("@lib/validationSchemas", () => ({
  validateUsernameAndPassword: vi.fn(),
}));

vi.mock("@lib/verify-helper", () => ({
  checkEmailVerification: vi.fn(),
  checkMFAFactors: vi.fn(),
}));

vi.mock("@lib/zitadel", () => ({
  getLockoutSettings: vi.fn(),
  getLoginSettings: vi.fn(),
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

  it("returns generic error when login settings cannot be loaded", async () => {
    vi.mocked(getLoginSettings).mockResolvedValue(undefined as never);

    const response = await submitLoginForm({
      username: "person@canada.ca",
      password: "P@ssw0rd",
    });

    expect(response).toEqual({ error: "translated:validation.invalidCredentials" });
    expect(createSessionAndUpdateCookie).not.toHaveBeenCalled();
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

    const response = await submitLoginForm({
      username: "person@canada.ca",
      password: "P@ssw0rd",
      requestId: "req-123",
    });

    expect(response).toEqual({ redirect: "/verify?requestId=req-123" });
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

    const response = await submitLoginForm({
      username: "person@canada.ca",
      password: "P@ssw0rd",
      requestId: "req-123",
    });

    expect(response).toEqual({ redirect: "/mfa?requestId=req-123" });
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

    const response = await submitLoginForm(command);

    expect(response).toEqual({ redirect: "/account?requestId=req-123" });
    expect(create).toHaveBeenCalledWith(ChecksSchema, {
      user: { search: { case: "loginName", value: command.username } },
      password: { password: command.password },
    });
    expect(createSessionAndUpdateCookie).toHaveBeenCalledWith({
      checks: { checks: "value" },
      requestId: command.requestId,
    });
  });
});
