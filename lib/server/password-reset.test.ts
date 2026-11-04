import { create, timestampFromMs } from "@zitadel/client";
import {
  MachineUserSchema,
  type User,
  UserSchema,
  UserState,
} from "@zitadel/proto/zitadel/user/v2/user_pb";
import {
  AuthenticationMethodType,
  GetUserByIDResponseSchema,
  ListAuthenticationMethodTypesResponseSchema,
} from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logMessage } from "@lib/logger";
import { createSigner } from "@lib/signing";
import { getUserByID, listAuthenticationMethodTypes } from "@lib/zitadel";

import {
  getPasswordResetRequest,
  signResetLink,
  storePasswordResetRequest,
  verifyResetLink,
} from "./password-reset";

const resetCookie = vi.hoisted(() => ({
  get: vi.fn<() => { value: string } | undefined>(),
  set: vi.fn<(name: string, value: string, options: unknown) => void>(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => resetCookie),
}));

vi.mock("@lib/zitadel", () => ({
  getUserByID: vi.fn(),
  listAuthenticationMethodTypes: vi.fn(),
}));

vi.mock("@lib/logger", () => ({
  logMessage: { warn: vi.fn(), error: vi.fn() },
}));

describe("password reset requests", () => {
  const now = 1792497600;
  const command = { loginName: "person@canada.ca", requestId: "oidc_original" };
  const payload = { ...command, expiry: now + 900 };
  const signer = createSigner("PASSWORD_RESET_SECRET", "password-reset-request", 32);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const setToken = (token: string) => resetCookie.get.mockReturnValue({ value: token });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now * 1000);
    vi.stubEnv("PASSWORD_RESET_SECRET", "current-password-reset-signing-secret");
    resetCookie.set.mockImplementation((_, value) => {
      setToken(value);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it.each(["production", "development"])(
    "stores a signed 15-minute cookie with appropriate attributes in %s",
    async (environment) => {
      vi.stubEnv("NODE_ENV", environment);

      await storePasswordResetRequest(command);

      const token = resetCookie.set.mock.calls[0][1];
      const [encoded, signature] = token.split(".");
      expect(JSON.parse(Buffer.from(encoded, "base64url").toString())).toEqual(payload);
      expect(signer.verify(encoded, signature)).toBe(true);
      expect(resetCookie.set).toHaveBeenCalledExactlyOnceWith("password-reset-request", token, {
        httpOnly: true,
        secure: environment === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 900,
      });
      await expect(getPasswordResetRequest()).resolves.toEqual(payload);
      expect(resetCookie.get).toHaveBeenCalledWith("password-reset-request");
    }
  );

  it("round-trips a normalized username without an OIDC request", async () => {
    await storePasswordResetRequest({ loginName: " Person@Canada.ca " });

    await expect(getPasswordResetRequest()).resolves.toEqual({
      loginName: "person@canada.ca",
      expiry: now + 900,
    });
  });

  it("rejects invalid input before writing a cookie", async () => {
    await expect(storePasswordResetRequest({ loginName: "not-an-email" })).rejects.toThrow();
    expect(resetCookie.set).not.toHaveBeenCalled();
  });

  it("returns undefined without logging when the cookie is absent", async () => {
    await expect(getPasswordResetRequest()).resolves.toBeUndefined();
    expect(logMessage.warn).not.toHaveBeenCalled();
  });

  it("accepts a request just before expiry and rejects it at the expiry boundary", async () => {
    await storePasswordResetRequest(command);
    vi.advanceTimersByTime(900_000 - 1);
    await expect(getPasswordResetRequest()).resolves.toEqual(payload);
    vi.advanceTimersByTime(1);
    await expect(getPasswordResetRequest()).resolves.toBeUndefined();
    expect(logMessage.warn).toHaveBeenCalledWith("Failed to verify password reset request", {
      error: new Error("Password reset request expired"),
    });
    expect(resetCookie.set).toHaveBeenCalledOnce();
  });

  it.each([
    ["username", { ...payload, loginName: "other@canada.ca" }],
    ["OIDC request", { ...payload, requestId: "oidc_other" }],
    ["expiry", { ...payload, expiry: now + 1800 }],
  ])("rejects a tampered %s", async (_, tampered) => {
    setToken(`${encode(tampered)}.${signer.sign(encode(payload))}`);

    await expect(getPasswordResetRequest()).resolves.toBeUndefined();
    expect(logMessage.warn).toHaveBeenCalledWith("Failed to verify password reset request", {
      error: new Error("Password reset request signature did not match"),
    });
  });

  it.each([
    ["malformed token", "not-a-token"],
    [
      "signed invalid payload",
      () => {
        const encoded = encode({ ...payload, loginName: "" });
        return `${encoded}.${signer.sign(encoded)}`;
      },
    ],
  ])("logs and rejects a %s", async (_, token) => {
    setToken(typeof token === "function" ? token() : token);

    await expect(getPasswordResetRequest()).resolves.toBeUndefined();
    expect(logMessage.warn).toHaveBeenCalledWith("Failed to verify password reset request", {
      error: expect.any(Error),
    });
  });
});

describe("password reset links", () => {
  const userId = "user-123";
  const requestId = "oidc_V2_123456789";
  const passwordChanged = timestampFromMs(1700000000123);
  const now = 1792497600;
  const ttlSeconds = 15 * 60;
  const validPayload = {
    userId,
    expiry: now + ttlSeconds,
    passwordChanged: "1700000000.123000000",
  };

  const signer = createSigner("PASSWORD_RESET_SECRET", "password-reset-link", 32);
  const encode = (payload: unknown) => Buffer.from(JSON.stringify(payload)).toString("base64url");
  const decode = (token: string) =>
    JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
  const sign = () => signResetLink({ userId, passwordChanged });
  // Correctly signed token for an arbitrary payload, to exercise payload validation.
  const signPayload = (payload: unknown) => `${encode(payload)}.${signer.sign(encode(payload))}`;
  // Arbitrary payload with a signature lifted from a genuine token, to exercise tampering.
  const forge = (payload: unknown, genuineToken = sign()) =>
    `${encode(payload)}.${genuineToken.split(".")[1]}`;

  const userResponse = (mutate: (user: User) => void = () => {}) => {
    const user = create(UserSchema, {
      userId,
      state: UserState.ACTIVE,
      type: { case: "human", value: { passwordChanged } },
    });
    mutate(user);
    return create(GetUserByIDResponseSchema, { user });
  };
  const withPasswordChanged =
    (value: ReturnType<typeof timestampFromMs> | undefined) => (user: User) => {
      if (user.type.case === "human") user.type.value.passwordChanged = value;
    };
  const mockAuthMethods = (authMethodTypes: AuthenticationMethodType[]) =>
    vi
      .mocked(listAuthenticationMethodTypes)
      .mockResolvedValue(create(ListAuthenticationMethodTypesResponseSchema, { authMethodTypes }));

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now * 1000);
    vi.stubEnv("PASSWORD_RESET_SECRET", "current-password-reset-signing-secret");
    vi.mocked(getUserByID).mockResolvedValue(userResponse());
    mockAuthMethods([AuthenticationMethodType.TOTP]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it.each([AuthenticationMethodType.TOTP, AuthenticationMethodType.U2F])(
    "signs a 15 minute link that verifies for an active human with strong MFA method %s",
    async (method) => {
      mockAuthMethods([method]);
      const token = sign();

      expect(decode(token)).toEqual(validPayload);
      await expect(verifyResetLink(token)).resolves.toEqual(validPayload);
      expect(getUserByID).toHaveBeenCalledExactlyOnceWith(userId);
      expect(listAuthenticationMethodTypes).toHaveBeenCalledExactlyOnceWith(userId);
    }
  );

  it("signs a trimmed OIDC requestId and returns it after verification", async () => {
    const token = signResetLink({ userId, passwordChanged, requestId: ` ${requestId} ` });
    await expect(verifyResetLink(token)).resolves.toEqual({ ...validPayload, requestId });
  });

  it("refuses to sign a requestId over 200 characters", () => {
    expect(() => signResetLink({ userId, passwordChanged, requestId: "a".repeat(201) })).toThrow();
  });

  it("rejects a link at the expiry boundary, but accepts it one millisecond earlier", async () => {
    const token = sign();
    vi.advanceTimersByTime(ttlSeconds * 1000 - 1);
    await expect(verifyResetLink(token)).resolves.toBeDefined();
    vi.advanceTimersByTime(1);
    await expect(verifyResetLink(token)).resolves.toBeUndefined();
  });

  it.each([
    ["user ID", () => forge({ ...validPayload, userId: "other-user" })],
    ["expiry", () => forge({ ...validPayload, expiry: validPayload.expiry + 1 })],
    ["password timestamp", () => forge({ ...validPayload, passwordChanged: "1700000001.1" })],
    ["added requestId", () => forge({ ...validPayload, requestId })],
    [
      "removed requestId",
      () => forge(validPayload, signResetLink({ userId, passwordChanged, requestId })),
    ],
    ["signature", () => `${encode(validPayload)}.${"A".repeat(43)}`],
  ])("rejects a tampered %s before looking up the user", async (_, token) => {
    await expect(verifyResetLink(token())).resolves.toBeUndefined();
    expect(getUserByID).not.toHaveBeenCalled();
    expect(logMessage.warn).toHaveBeenCalledWith("Failed to verify password reset link", {
      error: new Error("Password reset link signature did not match"),
    });
  });

  it.each([
    "",
    "not-a-token",
    "a.b.c",
    ".signature",
    "e30.",
    "!.signature",
    `${encode(validPayload)}.!`,
    `${encode(validPayload)}.${"A".repeat(42)}`,
    `${encode(validPayload)}.${"A".repeat(43)}=`,
    `${encode(validPayload)}.${"A".repeat(43)}.extra`,
  ])("rejects malformed token %s before looking up the user", async (token) => {
    await expect(verifyResetLink(token)).resolves.toBeUndefined();
    expect(getUserByID).not.toHaveBeenCalled();
  });

  it.each([
    ["a non-object payload", null],
    ["an empty user ID", { ...validPayload, userId: "" }],
    ["a non-string user ID", { ...validPayload, userId: 123 }],
    ["an expired expiry", { ...validPayload, expiry: now }],
    ["a non-numeric expiry", { ...validPayload, expiry: String(validPayload.expiry) }],
    ["an unsafe integer expiry", { ...validPayload, expiry: Number.MAX_SAFE_INTEGER + 1 }],
    ["a missing password timestamp", { ...validPayload, passwordChanged: undefined }],
    ["a malformed password timestamp", { ...validPayload, passwordChanged: "short" }],
    ["an oversized requestId", { ...validPayload, requestId: "a".repeat(201) }],
  ])("rejects a signed payload with %s before looking up the user", async (_, payload) => {
    await expect(verifyResetLink(signPayload(payload))).resolves.toBeUndefined();
    expect(getUserByID).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", create(GetUserByIDResponseSchema)],
    ["a different user", userResponse((user) => (user.userId = "other-user"))],
    ["inactive", userResponse((user) => (user.state = UserState.INACTIVE))],
    ["locked", userResponse((user) => (user.state = UserState.LOCKED))],
    [
      "not human",
      userResponse((user) => (user.type = { case: "machine", value: create(MachineUserSchema) })),
    ],
    ["changed password seconds", userResponse(withPasswordChanged(timestampFromMs(1700000001123)))],
    ["changed password nanos", userResponse(withPasswordChanged(timestampFromMs(1700000000124)))],
  ])("rejects the link when the user is %s, before checking MFA", async (_, response) => {
    vi.mocked(getUserByID).mockResolvedValue(response);
    await expect(verifyResetLink(sign())).resolves.toBeUndefined();
    expect(listAuthenticationMethodTypes).not.toHaveBeenCalled();
  });

  it.each([
    ["no methods", []],
    ["only email OTP", [AuthenticationMethodType.OTP_EMAIL]],
  ])("rejects users without TOTP or U2F (%s)", async (_, methods) => {
    mockAuthMethods(methods);
    await expect(verifyResetLink(sign())).resolves.toBeUndefined();
  });

  it.each([1700000000, "1700000000", BigInt(1700000000)])(
    "signs the same link for password timestamp seconds %s",
    (seconds) => {
      expect(
        signResetLink({ userId, passwordChanged: { seconds, nanos: passwordChanged.nanos } })
      ).toBe(sign());
    }
  );

  it("verifies against a serialized password timestamp returned by getUserByID", async () => {
    vi.mocked(getUserByID).mockResolvedValue(
      JSON.parse(
        JSON.stringify(userResponse(), (_, value) =>
          typeof value === "bigint" ? String(value) : value
        )
      )
    );
    await expect(verifyResetLink(sign())).resolves.toEqual(validPayload);
  });

  it("supports users without a password change and invalidates the link once one is set", async () => {
    const token = signResetLink({ userId, passwordChanged: undefined });
    vi.mocked(getUserByID).mockResolvedValue(userResponse(withPasswordChanged(undefined)));
    await expect(verifyResetLink(token)).resolves.toBeDefined();

    vi.mocked(getUserByID).mockResolvedValue(userResponse());
    await expect(verifyResetLink(token)).resolves.toBeUndefined();
  });

  it("fails closed without a signing secret", async () => {
    const token = sign();
    vi.stubEnv("PASSWORD_RESET_SECRET", undefined);
    expect(sign).toThrow("Set PASSWORD_RESET_SECRET");
    await expect(verifyResetLink(token)).resolves.toBeUndefined();
    expect(getUserByID).not.toHaveBeenCalled();
  });

  it.each([getUserByID, listAuthenticationMethodTypes])(
    "logs and rejects Zitadel lookup failures",
    async (lookup) => {
      vi.mocked(lookup).mockRejectedValue(new Error("Zitadel unavailable"));
      await expect(verifyResetLink(sign())).resolves.toBeUndefined();
      expect(logMessage.warn).toHaveBeenCalledWith("Failed to verify password reset link", {
        error: expect.any(Error),
      });
    }
  );
});
