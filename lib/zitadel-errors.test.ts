import { Code, ConnectError } from "@connectrpc/connect";
import { ErrorDetailSchema } from "@zitadel/proto/zitadel/message_pb";
import { describe, expect, it } from "vitest";

import { getZitadelUiError, parseZitadelError } from "./zitadel-errors";

describe("parseZitadelError", () => {
  it("parses a ConnectError with code, metadata headers, and detail payload", () => {
    const error = new ConnectError(
      "Invalid argument",
      Code.InvalidArgument,
      {
        "grpc-status": "3",
        "grpc-message": "otpinvalidcode",
      },
      [
        {
          desc: ErrorDetailSchema,
          value: {
            id: "OTPInvalidCode",
            message: "invalid code",
          },
        },
      ]
    );

    const parsed = parseZitadelError(error);

    expect(parsed.code).toBe(Code.InvalidArgument);
    expect(parsed.text).toContain("otpinvalidcode");
    expect(parsed.text).toContain("invalid code");
    expect(parsed.text).toContain("invalid argument");
  });

  it("falls back to grpc-status header when code is missing", () => {
    const parsed = parseZitadelError({
      message: "message",
      rawMessage: "raw",
      metadata: {
        get: (key: string) => (key === "grpc-status" ? "6" : null),
      },
    });

    expect(parsed.code).toBe(6);
    expect(parsed.text).toContain("raw");
    expect(parsed.text).toContain("message");
  });
});

describe("getZitadelUiError", () => {
  it("maps InvalidArgument connect errors for otp.verify to invalidCode", () => {
    const error = new ConnectError("Invalid argument", Code.InvalidArgument, {
      "grpc-status": "3",
      "grpc-message": "invalid code",
    });

    const result = getZitadelUiError("otp.verify", error);

    expect(result).toEqual({ errorKey: "set.invalidCode", blockContinue: undefined });
  });

  it("maps AlreadyExists connect errors for otp.set to alreadySetUp", () => {
    const error = new ConnectError("already configured", Code.AlreadyExists, {
      "grpc-status": "6",
      "grpc-message": "already set up",
    });

    const result = getZitadelUiError("otp.set", error);

    expect(result).toEqual({ errorKey: "set.alreadySetUp", blockContinue: undefined });
  });

  it("returns the context fallback when no rule matches", () => {
    const error = new ConnectError("not matched", Code.Internal);

    expect(getZitadelUiError("otp.verify", error)).toEqual({ errorKey: "set.genericError" });
    expect(getZitadelUiError("otp.set", error)).toEqual({
      errorKey: "set.genericError",
      blockContinue: true,
    });
  });

  it("maps otp.verify errors identified only by the error detail payload to invalidCode", () => {
    const error = new ConnectError("Errors.Session.Totp.InvalidCode", Code.Unknown, undefined, [
      {
        desc: ErrorDetailSchema,
        value: { id: "OTPInvalidCode", message: "invalid code" },
      },
    ]);

    const result = getZitadelUiError("otp.verify", error);

    expect(result).toEqual({ errorKey: "set.invalidCode", blockContinue: undefined });
  });

  it("maps otp.verify length errors to invalidCodeLength before invalidCode", () => {
    const error = new ConnectError("invalid value: value length must be 6", Code.InvalidArgument);

    const result = getZitadelUiError("otp.verify", error);

    expect(result).toEqual({ errorKey: "set.invalidCodeLength", blockContinue: undefined });
  });

  it("returns the fallback for string errors, which cannot be parsed", () => {
    const result = getZitadelUiError("otp.verify", "invalid code");

    expect(result).toEqual({ errorKey: "set.genericError" });
  });
});
