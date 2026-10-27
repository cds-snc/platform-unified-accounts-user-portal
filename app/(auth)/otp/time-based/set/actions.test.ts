import { Code, ConnectError } from "@connectrpc/connect";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateSession } from "@lib/server/session";
import { validateTotpCode } from "@lib/validation/validationSchemas";
import { verifyTOTPRegistration } from "@lib/zitadel";

import { verifyAndRegisterTOTP } from "./actions";

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@lib/actions/authenticated", () => ({
  // Provide a fake session so the wrapped action can be called directly
  AuthenticatedAction: (_options: unknown, action: (...args: never[]) => unknown) => {
    return (...args: unknown[]) =>
      action({ factors: { user: { id: "user-1" } } } as never, ...(args as never[]));
  },
}));

vi.mock("@lib/server/route-protection", () => ({
  AuthLevel: { MFA_CHANGE_REQUIRED: "mfa_change_required" },
}));

vi.mock("@lib/server/session", () => ({
  updateSession: vi.fn(),
}));

vi.mock("@lib/zitadel", () => ({
  verifyTOTPRegistration: vi.fn(),
}));

vi.mock("@lib/validation/validationSchemas", () => ({
  validateTotpCode: vi.fn(),
}));

vi.mock("@lib/logger", () => ({
  logMessage: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const invalidCodeError = () =>
  new ConnectError("Invalid argument", Code.InvalidArgument, {
    "grpc-status": "3",
    "grpc-message": "invalid code",
  });

describe("verifyAndRegisterTOTP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateTotpCode).mockResolvedValue({ success: true } as never);
    vi.mocked(verifyTOTPRegistration).mockResolvedValue(undefined as never);
  });

  it("returns an invalid code error key instead of throwing when Zitadel rejects the code", async () => {
    vi.mocked(verifyTOTPRegistration).mockRejectedValue(invalidCodeError());

    const result = await verifyAndRegisterTOTP({ code: "123456" });

    expect(result).toEqual({ errorKey: "set.invalidCode" });
    expect(updateSession).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("returns the generic error key for unmapped failures without leaking the message", async () => {
    vi.mocked(verifyTOTPRegistration).mockRejectedValue(new Error("database exploded"));

    const result = await verifyAndRegisterTOTP({ code: "123456" });

    expect(result).toEqual({ errorKey: "set.genericError" });
  });

  it("returns the length error key when the code format is invalid", async () => {
    vi.mocked(validateTotpCode).mockResolvedValue({ success: false, issues: [] } as never);

    const result = await verifyAndRegisterTOTP({ code: "12" });

    expect(result).toEqual({ errorKey: "set.invalidCodeLength" });
    expect(verifyTOTPRegistration).not.toHaveBeenCalled();
  });

  it("returns an error key when the session check fails after registration", async () => {
    vi.mocked(updateSession).mockResolvedValue({ error: invalidCodeError() } as never);

    const result = await verifyAndRegisterTOTP({ code: "123456", checkAfter: true });

    expect(result).toEqual({ errorKey: "set.invalidCode" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("redirects to all-set on success", async () => {
    await verifyAndRegisterTOTP({ code: " 123456 ", requestId: "req-1" });

    expect(verifyTOTPRegistration).toHaveBeenCalledWith({ code: "123456", userId: "user-1" });
    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock.mock.calls[0][0]).toContain("/all-set");
  });

  it("verifies the session when checkAfter is set", async () => {
    vi.mocked(updateSession).mockResolvedValue({ sessionId: "s1" } as never);

    await verifyAndRegisterTOTP({ code: "123456", checkAfter: true });

    expect(updateSession).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledTimes(1);
  });
});
