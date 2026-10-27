import { create, timestampFromMs } from "@zitadel/client";
import { UserSchema, UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";
import {
  AuthenticationMethodType,
  GetUserByIDResponseSchema,
  ListAuthenticationMethodTypesResponseSchema,
} from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logMessage } from "@lib/logger";
import { getUserByID, listAuthenticationMethodTypes } from "@lib/zitadel";

import { PASSWORD_RESET_TTL_SECONDS, signResetLink, verifyResetLink } from "./password-reset";

vi.mock("@lib/zitadel", () => ({
  getUserByID: vi.fn(),
  listAuthenticationMethodTypes: vi.fn(),
}));

vi.mock("@lib/logger", () => ({
  logMessage: { warn: vi.fn() },
}));

describe("password reset links", () => {
  const secret = "current-password-reset-signing-secret";
  const userId = "user-123";
  const passwordChanged = timestampFromMs(1700000000123);
  const now = 1792497600;

  const makeUser = () =>
    create(UserSchema, {
      userId,
      state: UserState.ACTIVE,
      type: { case: "human", value: { passwordChanged } },
    });
  const sign = () => signResetLink({ userId, passwordChanged });
  const decode = (token: string) =>
    JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString());
  const fingerprint = () => decode(sign()).passwordChanged as string;
  const hmac = (value: string) => createHmac("sha256", secret).update(value).digest("base64url");
  // Correctly signed token for an arbitrary payload, to exercise payload validation.
  const signPayload = (payload: unknown) => {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `${encoded}.${hmac(encoded)}`;
  };
  // Arbitrary payload with a signature lifted from a genuine token, to exercise tampering.
  const forge = (payload: unknown) =>
    `${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${sign().split(".")[1]}`;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now * 1000);
    vi.stubEnv("PASSWORD_RESET_SECRET", secret);
    vi.mocked(getUserByID).mockResolvedValue(
      create(GetUserByIDResponseSchema, { user: makeUser() })
    );
    vi.mocked(listAuthenticationMethodTypes).mockResolvedValue(
      create(ListAuthenticationMethodTypesResponseSchema, {
        authMethodTypes: [AuthenticationMethodType.TOTP],
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("signs the exact encoded payload containing a keyed password timestamp fingerprint", () => {
    const payload = {
      userId,
      expiry: now + PASSWORD_RESET_TTL_SECONDS,
      passwordChanged: hmac("1700000000.123000000"),
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");

    expect(sign()).toBe(`${encoded}.${hmac(encoded)}`);
    expect(PASSWORD_RESET_TTL_SECONDS).toBeLessThanOrEqual(60 * 60);
  });

  it("does not expose the password timestamp in the link", () => {
    const token = sign();
    expect(token).not.toContain("1700000000");
    expect(JSON.stringify(decode(token))).not.toContain("1700000000");
    expect(fingerprint()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("rejects forged links before looking up any user", async () => {
    await expect(
      verifyResetLink(
        forge({ userId: "other-user", expiry: now + 60, passwordChanged: fingerprint() })
      )
    ).resolves.toBeUndefined();
    expect(getUserByID).not.toHaveBeenCalled();
    expect(listAuthenticationMethodTypes).not.toHaveBeenCalled();
    expect(logMessage.warn).toHaveBeenCalledWith("Failed to verify password reset link", {
      error: new Error("Password reset link signature did not match"),
    });
  });

  it.each([AuthenticationMethodType.TOTP, AuthenticationMethodType.U2F])(
    "validates an active human with strong MFA method %s",
    async (method) => {
      vi.mocked(listAuthenticationMethodTypes).mockResolvedValue(
        create(ListAuthenticationMethodTypesResponseSchema, { authMethodTypes: [method] })
      );
      await expect(verifyResetLink(sign())).resolves.toEqual({
        userId,
        expiry: now + PASSWORD_RESET_TTL_SECONDS,
        passwordChanged: fingerprint(),
      });
      expect(getUserByID).toHaveBeenCalledExactlyOnceWith(userId);
      expect(listAuthenticationMethodTypes).toHaveBeenCalledExactlyOnceWith(userId);
      expect(logMessage.warn).not.toHaveBeenCalled();
    }
  );

  it.each([1700000000, "1700000000", BigInt(1700000000)])(
    "normalizes password timestamp seconds %s when signing",
    async (seconds) => {
      const token = signResetLink({
        userId,
        passwordChanged: { seconds, nanos: passwordChanged.nanos },
      });
      expect(token).toBe(sign());
      await expect(verifyResetLink(token)).resolves.toEqual({
        userId,
        expiry: now + PASSWORD_RESET_TTL_SECONDS,
        passwordChanged: fingerprint(),
      });
    }
  );

  it("normalizes the serialized password timestamp returned by getUserByID", async () => {
    const response = create(GetUserByIDResponseSchema, { user: makeUser() });
    vi.mocked(getUserByID).mockResolvedValue(
      JSON.parse(
        JSON.stringify(response, (_, value) => (typeof value === "bigint" ? String(value) : value))
      )
    );
    await expect(verifyResetLink(sign())).resolves.toEqual({
      userId,
      expiry: now + PASSWORD_RESET_TTL_SECONDS,
      passwordChanged: fingerprint(),
    });
  });

  it.each([now - 1, now, "1792498500", null, undefined, {}, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid or expired expiry %s before looking up any user",
    async (expiry) => {
      await expect(
        verifyResetLink(signPayload({ userId, expiry, passwordChanged: fingerprint() }))
      ).resolves.toBeUndefined();
      expect(getUserByID).not.toHaveBeenCalled();
      expect(listAuthenticationMethodTypes).not.toHaveBeenCalled();
      expect(logMessage.warn).toHaveBeenCalled();
    }
  );

  it.each([null, false, 123, "payload", [], {}])(
    "rejects invalid payload %j before looking up any user",
    async (payload) => {
      await expect(verifyResetLink(signPayload(payload))).resolves.toBeUndefined();
      expect(getUserByID).not.toHaveBeenCalled();
      expect(listAuthenticationMethodTypes).not.toHaveBeenCalled();
      expect(logMessage.warn).toHaveBeenCalledWith("Failed to verify password reset link", {
        error: expect.any(Error),
      });
    }
  );

  it("signs and returns an OIDC requestId, rejecting tampering with it", async () => {
    const requestId = "oidc_V2_123456789";
    const token = signResetLink({ userId, passwordChanged, requestId });
    const [payload, signature] = token.split(".");

    expect(JSON.parse(Buffer.from(payload, "base64url").toString())).toEqual({
      userId,
      expiry: now + PASSWORD_RESET_TTL_SECONDS,
      passwordChanged: fingerprint(),
      requestId,
    });
    await expect(verifyResetLink(token)).resolves.toEqual({
      userId,
      expiry: now + PASSWORD_RESET_TTL_SECONDS,
      passwordChanged: fingerprint(),
      requestId,
    });

    const tampered = `${Buffer.from(
      JSON.stringify({
        userId,
        expiry: now + PASSWORD_RESET_TTL_SECONDS,
        passwordChanged: fingerprint(),
        requestId: "oidc_other",
      })
    ).toString("base64url")}.${signature}`;
    const stripped = `${sign().split(".")[0]}.${signature}`;
    await expect(verifyResetLink(tampered)).resolves.toBeUndefined();
    await expect(verifyResetLink(stripped)).resolves.toBeUndefined();
    expect(getUserByID).toHaveBeenCalledOnce();
  });

  it("refuses to sign or accept a requestId over 200 characters", async () => {
    const requestId = "a".repeat(201);
    expect(() => signResetLink({ userId, passwordChanged, requestId })).toThrow();
    await expect(
      verifyResetLink(
        signPayload({
          userId,
          expiry: now + PASSWORD_RESET_TTL_SECONDS,
          passwordChanged: fingerprint(),
          requestId,
        })
      )
    ).resolves.toBeUndefined();
    expect(getUserByID).not.toHaveBeenCalled();
  });

  it("signs the trimmed requestId so it verifies after parsing", async () => {
    const token = signResetLink({ userId, passwordChanged, requestId: " oidc_V2_1 " });
    await expect(verifyResetLink(token)).resolves.toMatchObject({ requestId: "oidc_V2_1" });
  });

  it("accepts additional signed payload fields without including them in the verified link", async () => {
    await expect(
      verifyResetLink(
        signPayload({
          userId,
          expiry: now + PASSWORD_RESET_TTL_SECONDS,
          passwordChanged: fingerprint(),
          extra: true,
        })
      )
    ).resolves.toEqual({
      userId,
      expiry: now + PASSWORD_RESET_TTL_SECONDS,
      passwordChanged: fingerprint(),
    });
  });

  it.each([undefined, "", "short", "A".repeat(42) + "!", { seconds: "1700000000", nanos: 0 }])(
    "rejects a signed payload with invalid password fingerprint %j before looking up any user",
    async (invalid) => {
      await expect(
        verifyResetLink(
          signPayload({
            userId,
            expiry: now + PASSWORD_RESET_TTL_SECONDS,
            passwordChanged: invalid,
          })
        )
      ).resolves.toBeUndefined();
      expect(getUserByID).not.toHaveBeenCalled();
    }
  );

  it("rejects a link at the expiry boundary, but accepts it one millisecond earlier", async () => {
    const token = sign();
    vi.advanceTimersByTime(PASSWORD_RESET_TTL_SECONDS * 1000 - 1);
    await expect(verifyResetLink(token)).resolves.toBeDefined();
    vi.advanceTimersByTime(1);
    await expect(verifyResetLink(token)).resolves.toBeUndefined();
  });

  it.each(["", "not-a-token", "a.b.c", ".signature", "e30.", "!.signature", "bnVsbA.signature"])(
    "rejects malformed token %s",
    async (token) => {
      await expect(verifyResetLink(token)).resolves.toBeUndefined();
      expect(getUserByID).not.toHaveBeenCalled();
      expect(logMessage.warn).toHaveBeenCalled();
    }
  );

  it.each(["", null, 123, undefined, true, [], {}])(
    "rejects invalid user ID %s",
    async (invalidId) => {
      await expect(
        verifyResetLink(
          signPayload({ userId: invalidId, expiry: now + 60, passwordChanged: fingerprint() })
        )
      ).resolves.toBeUndefined();
      expect(getUserByID).not.toHaveBeenCalled();
    }
  );

  it("rejects missing users before fetching MFA methods", async () => {
    vi.mocked(getUserByID).mockResolvedValue(create(GetUserByIDResponseSchema));
    await expect(verifyResetLink(sign())).resolves.toBeUndefined();
    expect(listAuthenticationMethodTypes).not.toHaveBeenCalled();
  });

  it.each([UserState.INACTIVE, UserState.LOCKED, UserState.INITIAL, UserState.DELETED])(
    "rejects human users with state %s before fetching MFA methods",
    async (state) => {
      const user = makeUser();
      user.state = state;
      vi.mocked(getUserByID).mockResolvedValue(create(GetUserByIDResponseSchema, { user }));
      await expect(verifyResetLink(sign())).resolves.toBeUndefined();
      expect(listAuthenticationMethodTypes).not.toHaveBeenCalled();
    }
  );

  it("rejects non-human users", async () => {
    const user = create(UserSchema, {
      userId,
      state: UserState.ACTIVE,
      type: { case: "machine", value: {} },
    });
    vi.mocked(getUserByID).mockResolvedValue(create(GetUserByIDResponseSchema, { user }));
    await expect(verifyResetLink(sign())).resolves.toBeUndefined();
    expect(listAuthenticationMethodTypes).not.toHaveBeenCalled();
  });

  it("rejects a response for a different user", async () => {
    const user = makeUser();
    user.userId = "other-user";
    vi.mocked(getUserByID).mockResolvedValue(create(GetUserByIDResponseSchema, { user }));
    await expect(verifyResetLink(sign())).resolves.toBeUndefined();
    expect(listAuthenticationMethodTypes).not.toHaveBeenCalled();
  });

  it("rejects users without TOTP or U2F, even if they have email OTP", async () => {
    vi.mocked(listAuthenticationMethodTypes).mockResolvedValue(
      create(ListAuthenticationMethodTypesResponseSchema, {
        authMethodTypes: [AuthenticationMethodType.OTP_EMAIL],
      })
    );
    await expect(verifyResetLink(sign())).resolves.toBeUndefined();
  });

  it.each(["seconds", "nanos"] as const)(
    "invalidates the link when the password timestamp's %s changes",
    async (field) => {
      const user = makeUser();
      if (user.type.case !== "human") throw new Error("Expected human fixture");
      user.type.value.passwordChanged = {
        ...passwordChanged,
        [field]:
          field === "seconds" ? passwordChanged.seconds + BigInt(1) : passwordChanged.nanos + 1,
      };
      vi.mocked(getUserByID).mockResolvedValue(create(GetUserByIDResponseSchema, { user }));
      await expect(verifyResetLink(sign())).resolves.toBeUndefined();
      expect(listAuthenticationMethodTypes).not.toHaveBeenCalled();
    }
  );

  it("normalizes an absent password timestamp and invalidates the link after a password is set", async () => {
    const token = signResetLink({ userId, passwordChanged: undefined });
    const user = makeUser();
    if (user.type.case !== "human") throw new Error("Expected human fixture");
    user.type.value.passwordChanged = undefined;
    vi.mocked(getUserByID).mockResolvedValue(create(GetUserByIDResponseSchema, { user }));
    await expect(verifyResetLink(token)).resolves.toBeDefined();
    vi.mocked(getUserByID).mockResolvedValue(
      create(GetUserByIDResponseSchema, { user: makeUser() })
    );
    await expect(verifyResetLink(token)).resolves.toBeUndefined();
  });

  it.each(["!", "A".repeat(42), "A".repeat(43) + "="])(
    "rejects malformed or incorrect signatures without throwing: %s",
    async (signature) => {
      await expect(
        verifyResetLink(`${sign().split(".")[0]}.${signature}`)
      ).resolves.toBeUndefined();
    }
  );

  it("rejects tampering with an otherwise valid expiry", async () => {
    await expect(
      verifyResetLink(
        forge({
          userId,
          expiry: now + PASSWORD_RESET_TTL_SECONDS + 1,
          passwordChanged: fingerprint(),
        })
      )
    ).resolves.toBeUndefined();
    expect(getUserByID).not.toHaveBeenCalled();
  });

  it("rejects tampering with the user ID even when the new user is eligible", async () => {
    const otherUser = makeUser();
    otherUser.userId = "other-user";
    vi.mocked(getUserByID).mockResolvedValue(
      create(GetUserByIDResponseSchema, { user: otherUser })
    );
    await expect(
      verifyResetLink(
        forge({
          userId: otherUser.userId,
          expiry: now + PASSWORD_RESET_TTL_SECONDS,
          passwordChanged: fingerprint(),
        })
      )
    ).resolves.toBeUndefined();
    expect(getUserByID).not.toHaveBeenCalled();
  });

  it("invalidates existing links when the signing secret changes", async () => {
    const oldToken = sign();
    vi.stubEnv("PASSWORD_RESET_SECRET", "replacement-password-reset-signing-secret");
    const newToken = sign();
    await expect(verifyResetLink(oldToken)).resolves.toBeUndefined();
    expect(getUserByID).not.toHaveBeenCalled();
    await expect(verifyResetLink(newToken)).resolves.toBeDefined();
  });

  it("fails closed without a signing secret", async () => {
    const token = sign();
    vi.stubEnv("PASSWORD_RESET_SECRET", undefined);
    expect(sign).toThrow("Missing PASSWORD_RESET_SECRET");
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
