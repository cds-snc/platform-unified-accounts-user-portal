import { Code, ConnectError } from "@connectrpc/connect";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getActiveSessionCookie } from "@lib/cookies";
import { setSessionAndUpdateCookie } from "@lib/server/cookie";
import { getOriginalHost } from "@lib/server/host";
import { validateTotpCode } from "@lib/validation/validationSchemas";

import { handleOTPFormSubmit } from "./actions";

vi.mock("@zitadel/client", () => ({
  create: vi.fn().mockReturnValue({ totp: { code: "123456" } }),
}));

vi.mock("@lib/actions/authenticated", () => ({
  AuthenticatedAction:
    (_options: unknown, action: (session: unknown, input: unknown) => Promise<unknown>) =>
    (input: unknown) =>
      action({}, input),
}));

vi.mock("@lib/server/auth-flow", () => ({
  completeFlowAndRedirect: vi.fn(),
}));

vi.mock("@lib/cookies", () => ({
  getActiveSessionCookie: vi.fn(),
}));

vi.mock("@lib/server/cookie", () => ({
  setSessionAndUpdateCookie: vi.fn(),
}));

vi.mock("@lib/server/host", () => ({
  getOriginalHost: vi.fn(),
}));

vi.mock("@lib/validation/validationSchemas", () => ({
  validateTotpCode: vi.fn(),
}));

vi.mock("@lib/zitadel", () => ({
  deleteSession: vi.fn(),
  getLoginSettings: vi.fn().mockResolvedValue({}),
  getSecuritySettings: vi.fn(),
  listAuthenticationMethodTypes: vi.fn(),
  listSessions: vi.fn(),
}));

vi.mock("@i18n/server", () => ({
  serverTranslation: vi.fn().mockResolvedValue({
    t: (key: string) => `translated:${key}`,
  }),
}));

vi.mock("@lib/logger", () => ({
  logMessage: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe("handleOTPFormSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveSessionCookie).mockResolvedValue({} as never);
    vi.mocked(getOriginalHost).mockResolvedValue("idp.example");
    vi.mocked(validateTotpCode).mockResolvedValue({ success: true } as never);
  });

  it("maps a rejected six-digit TOTP to the invalid-code message", async () => {
    vi.mocked(setSessionAndUpdateCookie).mockRejectedValue(
      new ConnectError("Invalid argument", Code.InvalidArgument, {
        "grpc-status": "3",
        "grpc-message": "otpinvalidcode",
      })
    );

    const result = await handleOTPFormSubmit({ code: "123456" });

    expect(result).toEqual({
      validationErrors: undefined,
      error: "translated:set.invalidCode",
      formData: { code: "123456" },
    });
  });
});
