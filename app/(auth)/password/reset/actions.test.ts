import { cookies } from "next/headers";
import { after } from "next/server";
import { GCNotifyConnector } from "@gcforms/connectors";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createResetKey,
  openResetSession,
  PASSWORD_RESET_COOKIE,
} from "@lib/server/password-reset";
import {
  createSessionFromChecks,
  listAuthenticationMethodTypes,
  listUsers,
  passwordResetWithReturn,
} from "@lib/zitadel";

import { setupServerActionContext } from "../../../../test/helpers/serverAction";

import { submitUserNameForm } from "./actions";

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
  },
}));

describe("submitUserNameForm", () => {
  const sendEmail = vi.fn();
  const setCookie = vi.fn();
  const originalNotifyApiKey = process.env.NOTIFY_API_KEY;
  const originalTemplateId = process.env.TEMPLATE_ID;

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
    setupServerActionContext();

    vi.mocked(listUsers).mockResolvedValue({
      details: { totalResult: BigInt(1) },
      result: [
        {
          userId: "user-123",
          type: {
            case: "human",
            value: {
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
    vi.mocked(cookies).mockResolvedValue({ set: setCookie } as never);

    sendEmail.mockResolvedValue(undefined);
    vi.mocked(GCNotifyConnector.default).mockReturnValue({ sendEmail } as never);

    process.env.NOTIFY_API_KEY = "notify-key";
    process.env.TEMPLATE_ID = "template-123";
  });

  it("responds the same and sends no email when no account exists", async () => {
    vi.mocked(listUsers).mockResolvedValue({
      details: { totalResult: BigInt(0) },
      result: [],
    } as never);

    const response = await submit();

    expect(response).toEqual({ success: true });
    expect(setCookie).toHaveBeenCalledWith(
      expect.objectContaining({ name: PASSWORD_RESET_COOKIE })
    );
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("emails a reset link that only opens with the requesting browser's cookie", async () => {
    const response = await submit();

    expect(response).toEqual({ success: true });
    const [email, , template] = sendEmail.mock.calls[0];
    expect(email).toBe("person@canada.ca");
    expect(template.formResponse).toContain("reset-456");
    expect(template.formResponse).toContain("requestId=req-123");

    const token = new URL(
      template.formResponse.match(/\((https:\/\/auth\.example\/[^)]+)\)/)[1]
    ).searchParams.get("token") as string;
    const key = setCookie.mock.calls[0][0].value;
    expect(openResetSession(token, key)).toEqual({
      sessionId: "session-1",
      sessionToken: "token-1",
    });
    expect(openResetSession(token, createResetKey())).toBeUndefined();
  });

  it("emails users without strong MFA to contact support", async () => {
    vi.mocked(listAuthenticationMethodTypes).mockResolvedValue({ authMethodTypes: [] } as never);

    const response = await submit();

    expect(response).toEqual({ success: true });
    expect(sendEmail.mock.calls[0][2].formResponse).toContain("https://auth.example/contact-us");
    expect(passwordResetWithReturn).not.toHaveBeenCalled();
    expect(createSessionFromChecks).not.toHaveBeenCalled();
  });

  afterEach(() => {
    process.env.NOTIFY_API_KEY = originalNotifyApiKey;
    process.env.TEMPLATE_ID = originalTemplateId;
  });
});
