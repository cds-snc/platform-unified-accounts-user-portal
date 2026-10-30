import { cookies } from "next/headers";
import { after } from "next/server";
import { GCNotifyConnector } from "@gcforms/connectors";
import { create } from "@zitadel/client";
import { UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";
import {
  AuthenticationMethodType,
  SetPasswordResponseSchema,
} from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logMessage } from "@lib/logger";
import { passwordResetWithCode, verifyPassword } from "@lib/server/password";
import { RESET_LINK_TTL_SECONDS } from "@lib/server/password-reset";
import { checkAuthenticationLevel } from "@lib/server/route-protection";
import { createSigner } from "@lib/signing";
import {
  createSessionFromChecks,
  listAuthenticationMethodTypes,
  listUsers,
  passwordResetWithReturn,
} from "@lib/zitadel";

import { setupServerActionContext } from "../../../../test/helpers/serverAction";

import { resetPassword, submitUserNameForm } from "./actions";

vi.mock("@lib/server/password", () => ({
  passwordResetWithCode: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("@lib/server/route-protection", () => ({
  checkAuthenticationLevel: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("next/server", () => ({
  after: vi.fn(),
}));

vi.mock("@gcforms/connectors", () => ({
  GCNotifyConnector: {
    default: vi.fn(),
  },
}));

vi.mock("@lib/service-url", () => ({
  getServiceUrlFromHeaders: vi.fn(),
}));

vi.mock("@lib/site-config", () => ({
  SiteConfigService: {
    getInstance: async () => ({ getSiteLink: (path: string) => `https://auth.example/${path}` }),
  },
}));

vi.mock("@lib/zitadel", () => ({
  createSessionFromChecks: vi.fn(),
  getUserByID: vi.fn(),
  listAuthenticationMethodTypes: vi.fn(),
  listUsers: vi.fn(),
  passwordResetWithReturn: vi.fn(),
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

describe("submitUserNameForm", () => {
  const sendEmail = vi.fn();
  const passwordChanged = { seconds: 1700000000, nanos: 123456789 };

  const submit = async () => {
    const response = await submitUserNameForm({
      loginName: "person@canada.ca",
      requestId: "req-123",
    });
    await (vi.mocked(after).mock.calls[0][0] as () => Promise<void>)();
    return response;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
    setupServerActionContext();

    vi.mocked(listUsers).mockResolvedValue({
      details: { totalResult: BigInt(1) },
      result: [
        {
          userId: "user-123",
          state: UserState.ACTIVE,
          type: {
            case: "human",
            value: {
              passwordChanged,
              email: {
                email: "person@canada.ca",
                isVerified: true,
              },
            },
          },
        },
      ],
    } as never);

    vi.mocked(listAuthenticationMethodTypes).mockResolvedValue({
      authMethodTypes: [AuthenticationMethodType.TOTP],
    } as never);

    vi.mocked(passwordResetWithReturn).mockResolvedValue({
      verificationCode: "reset-456",
    } as never);
    vi.mocked(createSessionFromChecks).mockResolvedValue({
      sessionId: "session-1",
      sessionToken: "token-1",
    } as never);

    sendEmail.mockResolvedValue(undefined);
    vi.mocked(GCNotifyConnector.default).mockReturnValue({ sendEmail } as never);

    vi.stubEnv("NOTIFY_API_KEY", "notify-key");
    vi.stubEnv("TEMPLATE_ID", "template-123");
    vi.stubEnv("PASSWORD_RESET_SECRET", "reset-signing-secret-at-least-32-chars");
  });

  it("responds the same and sends no email when no account exists", async () => {
    vi.mocked(listUsers).mockResolvedValue({
      details: { totalResult: BigInt(0) },
      result: [],
    } as never);

    const response = await submit();

    expect(response).toEqual({ success: true });
    expect(cookies).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(passwordResetWithReturn).not.toHaveBeenCalled();
  });

  it("defers all user lookups and reset code requests until after the response", async () => {
    await expect(submitUserNameForm({ loginName: "person@canada.ca" })).resolves.toEqual({
      success: true,
    });
    expect(after).toHaveBeenCalledExactlyOnceWith(expect.any(Function));
    expect(listUsers).not.toHaveBeenCalled();
    expect(passwordResetWithReturn).not.toHaveBeenCalled();
    expect(cookies).not.toHaveBeenCalled();
    expect(createSessionFromChecks).not.toHaveBeenCalled();
  });

  it("emails the Zitadel code and a signed link containing only a token, without a session or cookie", async () => {
    const response = await submit();

    expect(response).toEqual({ success: true });
    const [email, , template] = sendEmail.mock.calls[0];
    expect(email).toBe("person@canada.ca");
    expect(template.formResponse).toContain("reset-456");
    const url = new URL(template.formResponse.match(/\((https:\/\/auth\.example\/[^)]+)\)/)[1]);
    expect(url.pathname).toBe("/password/reset/continue");
    expect([...url.searchParams.keys()]).toEqual(["token"]);
    const token = url.searchParams.get("token")!;
    const [payload, signature] = token.split(".");
    const expiry = Math.floor(Date.now() / 1000) + RESET_LINK_TTL_SECONDS;
    const signer = createSigner("PASSWORD_RESET_SECRET", "password-reset-link", 32);
    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toEqual({
      userId: "user-123",
      expiry,
      passwordChanged: `${Number(passwordChanged.seconds)}.${Number(passwordChanged.nanos)}`,
      requestId: "req-123",
    });
    expect(signature).toBe(signer.sign(payload));
    expect(passwordResetWithReturn).toHaveBeenCalledExactlyOnceWith({ userId: "user-123" });
    expect(cookies).not.toHaveBeenCalled();
    expect(createSessionFromChecks).not.toHaveBeenCalled();
  });

  it("signs a valid requestId into the emailed link and drops invalid ones", async () => {
    const tokenPayload = () => {
      const formResponse = sendEmail.mock.lastCall![2].formResponse as string;
      const url = new URL(formResponse.match(/\((https:\/\/auth\.example\/[^)]+)\)/)![1]);
      const [payload] = url.searchParams.get("token")!.split(".");
      return JSON.parse(Buffer.from(payload, "base64url").toString());
    };

    await submitUserNameForm({ loginName: "person@canada.ca", requestId: "oidc_V2_123" });
    await (vi.mocked(after).mock.lastCall![0] as () => Promise<void>)();
    expect(tokenPayload()).toMatchObject({ userId: "user-123", requestId: "oidc_V2_123" });

    await submitUserNameForm({ loginName: "person@canada.ca", requestId: "a".repeat(201) });
    await (vi.mocked(after).mock.lastCall![0] as () => Promise<void>)();
    expect(tokenPayload()).not.toHaveProperty("requestId");
  });

  it("sends the email before responding in PR review environments", async () => {
    vi.stubEnv("PR_REVIEW", "true");
    await expect(submitUserNameForm({ loginName: "person@canada.ca" })).resolves.toEqual({
      success: true,
    });
    expect(after).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("emails users without strong MFA to contact support", async () => {
    vi.mocked(listAuthenticationMethodTypes).mockResolvedValue({ authMethodTypes: [] } as never);

    const response = await submit();

    expect(response).toEqual({ success: true });
    expect(sendEmail.mock.calls[0][2].formResponse).toContain("https://auth.example/contact-us");
    expect(passwordResetWithReturn).not.toHaveBeenCalled();
    expect(createSessionFromChecks).not.toHaveBeenCalled();
  });

  it("does not schedule email or access cookies when username validation fails", async () => {
    await expect(submitUserNameForm({ loginName: "" })).resolves.toEqual({
      error: "translated:errors.couldNotSendResetLink",
    });
    expect(cookies).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it("does not send email when Zitadel does not return a reset code", async () => {
    vi.mocked(passwordResetWithReturn).mockResolvedValue({});
    await expect(submit()).resolves.toEqual({ success: true });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(logMessage.error).toHaveBeenCalledWith("Failed to send password reset email", {
      error: expect.any(Error),
    });
  });

  it("does not send email when the reset signing secret is missing", async () => {
    vi.stubEnv("PASSWORD_RESET_SECRET", undefined);
    await expect(submit()).resolves.toEqual({ success: true });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(logMessage.error).toHaveBeenCalledWith("Failed to send password reset email", {
      error: expect.any(Error),
    });
  });

  it("preserves the non-enumerating response when email delivery fails", async () => {
    sendEmail.mockRejectedValue(new Error("Notify unavailable"));
    await expect(submit()).resolves.toEqual({ success: true });
    expect(logMessage.error).toHaveBeenCalled();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });
});

describe("resetPassword", () => {
  const command = { code: "123456", password: "NewPassword123!", requestId: "req-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAuthenticationLevel).mockResolvedValue({
      factors: { user: { id: "user-123", loginName: "person@canada.ca" } },
    } as never);
    vi.mocked(passwordResetWithCode).mockResolvedValue(create(SetPasswordResponseSchema));
  });

  it("resets the password with the code after MFA, then verifies the new password", async () => {
    vi.mocked(verifyPassword).mockImplementationOnce(async () => {
      expect(passwordResetWithCode).toHaveBeenCalledExactlyOnceWith({
        code: command.code,
        password: command.password,
        userId: "user-123",
      });
    });

    await resetPassword(command);

    expect(passwordResetWithCode).toHaveBeenCalledWith({
      code: command.code,
      password: command.password,
      userId: "user-123",
    });
    expect(checkAuthenticationLevel).toHaveBeenCalledWith("mfa_no_password", undefined, {
      requireEmailVerified: true,
    });
    expect(verifyPassword).toHaveBeenCalledWith({
      loginName: "person@canada.ca",
      checks: expect.objectContaining({
        password: expect.objectContaining({ password: command.password }),
      }),
      requestId: command.requestId,
    });
  });

  it("does not verify the password when resetting it fails", async () => {
    vi.mocked(passwordResetWithCode).mockResolvedValue({ error: "Reset failed" });

    await expect(resetPassword(command)).rejects.toThrow("Error in server action");

    expect(verifyPassword).not.toHaveBeenCalled();
  });
});
