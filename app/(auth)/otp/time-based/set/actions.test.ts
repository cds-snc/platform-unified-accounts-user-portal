import { Code, ConnectError } from "@connectrpc/connect";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { validateTotpCode } from "@lib/validation/validationSchemas";
import { verifyTOTPRegistration } from "@lib/zitadel";

import { verifyAndRegisterTOTP } from "./actions";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@lib/actions/authenticated", () => ({
  AuthenticatedAction:
    (_options: unknown, action: (session: unknown, input: unknown) => Promise<unknown>) =>
    (input: unknown) =>
      action({ factors: { user: { id: "user-123" } } }, input),
}));

vi.mock("@lib/validation/validationSchemas", () => ({
  validateTotpCode: vi.fn(),
}));

vi.mock("@lib/zitadel", () => ({
  verifyTOTPRegistration: vi.fn(),
}));

vi.mock("@lib/server/session", () => ({
  updateSession: vi.fn(),
}));

vi.mock("@lib/logger", () => ({
  logMessage: {
    debug: vi.fn(),
  },
}));

describe("verifyAndRegisterTOTP", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateTotpCode).mockResolvedValue({ success: true } as never);
  });

  it("returns the invalid-code key when Zitadel rejects a six-digit TOTP", async () => {
    vi.mocked(verifyTOTPRegistration).mockRejectedValue(
      new ConnectError("Invalid argument", Code.InvalidArgument, {
        "grpc-status": "3",
        "grpc-message": "otpinvalidcode",
      })
    );

    const result = await verifyAndRegisterTOTP({ code: "123456" });

    expect(result).toEqual({ errorKey: "set.invalidCode" });
  });
});
