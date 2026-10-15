import { Code, ConnectError } from "@connectrpc/connect";
import { ErrorDetailSchema } from "@zitadel/proto/zitadel/message_pb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { completeFlowAndRedirect } from "@lib/server/auth-flow";
import { updateSession } from "@lib/server/session";
import { validateTotpCode } from "@lib/validation/validationSchemas";
import { serverTranslation } from "@i18n/server";

import { handleOTPFormSubmit } from "./actions";

vi.mock("@lib/actions/authenticated", () => ({
  // Pass the session credentials through so the wrapped action can be called directly
  AuthenticatedAction: (_options: unknown, action: (...args: never[]) => unknown) => {
    return (...args: unknown[]) => action({} as never, ...(args as never[]));
  },
}));

vi.mock("@lib/server/session", () => ({
  updateSession: vi.fn(),
}));

vi.mock("@lib/server/auth-flow", () => ({
  completeFlowAndRedirect: vi.fn(),
}));

vi.mock("@lib/validation/validationSchemas", () => ({
  validateTotpCode: vi.fn(),
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

describe("handleOTPFormSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(serverTranslation).mockResolvedValue({
      t: (key: string) => `translated:${key}`,
    } as never);
    vi.mocked(validateTotpCode).mockResolvedValue({ success: true } as never);
  });

  it("returns the invalid code message when Zitadel rejects the code with an invalid argument error", async () => {
    vi.mocked(updateSession).mockRejectedValue(
      new ConnectError("Invalid argument", Code.InvalidArgument, {
        "grpc-status": "3",
        "grpc-message": "invalid code",
      })
    );

    const result = await handleOTPFormSubmit({ code: "123456", requestId: "request-123" });

    expect(result.error).toBe("translated:set.invalidCode");
    expect(result.validationErrors).toBeUndefined();
    expect(result.formData).toEqual({ code: "123456" });
    expect(completeFlowAndRedirect).not.toHaveBeenCalled();
  });

  it("returns the invalid code message when the rejection is only identified by the error detail", async () => {
    vi.mocked(updateSession).mockRejectedValue(
      new ConnectError("Errors.Session.Totp.InvalidCode", Code.InvalidArgument, undefined, [
        {
          desc: ErrorDetailSchema,
          value: { id: "OTPInvalidCode", message: "invalid code" },
        },
      ])
    );

    const result = await handleOTPFormSubmit({ code: "654321" });

    expect(result.error).toBe("translated:set.invalidCode");
  });

  it("returns the generic error for unmapped errors", async () => {
    vi.mocked(updateSession).mockRejectedValue(
      new ConnectError("Service unavailable", Code.Unavailable)
    );

    const result = await handleOTPFormSubmit({ code: "123456" });

    expect(result.error).toBe("translated:set.genericError");
  });

  it.each([
    ["a string", "could not get session or session does not have loginName"],
    ["a plain object", { error: "Failed to authenticate: You had 3 password attempts." }],
    ["an Error without Zitadel details", new Error("boom")],
  ])(
    "never forwards a raw upstream error to the client when the rejection is %s",
    async (_, rejection) => {
      vi.mocked(updateSession).mockRejectedValue(rejection);

      const result = await handleOTPFormSubmit({ code: "123456" });

      expect(result.error).toBe("translated:set.genericError");
    }
  );

  it("returns field validation errors without calling Zitadel when the code format is invalid", async () => {
    vi.mocked(validateTotpCode).mockResolvedValue({
      success: false,
      issues: [{ message: "invalidCodeLength", path: [{ key: "code" }] }],
    } as never);

    const result = await handleOTPFormSubmit({ code: "12" });

    expect(result.validationErrors).toEqual([
      { fieldKey: "code", fieldValue: "translated:verify.validation.invalidCodeLength" },
    ]);
    expect(result.error).toBeUndefined();
    expect(updateSession).not.toHaveBeenCalled();
  });

  it("trims the code before verifying it and completes the flow on success", async () => {
    vi.mocked(updateSession).mockResolvedValue({ sessionId: "session-123" });
    vi.mocked(completeFlowAndRedirect).mockResolvedValue({ error: "flow failed" } as never);

    const result = await handleOTPFormSubmit({ code: " 123456 ", requestId: "request-123" });

    expect(validateTotpCode).toHaveBeenCalledWith({ code: "123456" });
    expect(completeFlowAndRedirect).toHaveBeenCalledWith({
      sessionId: "session-123",
      requestId: "request-123",
    });
    expect(result.error).toBe("flow failed");
  });
});
