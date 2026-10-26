import { NextRequest } from "next/server";
import { create, timestampFromMs } from "@zitadel/client";
import { SessionSchema } from "@zitadel/proto/zitadel/session/v2/session_pb";
import {
  ChecksSchema,
  CreateSessionResponseSchema,
  GetSessionResponseSchema,
} from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { LoginSettingsSchema } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";
import { UserSchema, UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";
import {
  AuthenticationMethodType,
  GetUserByIDResponseSchema,
  ListAuthenticationMethodTypesResponseSchema,
} from "@zitadel/proto/zitadel/user/v2/user_service_pb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addSessionToCookie } from "@lib/cookies";
import { PASSWORD_RESET_TTL_SECONDS, signResetLink } from "@lib/server/password-reset";
import {
  createSessionFromChecks,
  getLoginSettings,
  getSession,
  getUserByID,
  listAuthenticationMethodTypes,
} from "@lib/zitadel";

import { GET } from "./route";

vi.mock("@lib/cookies", () => ({
  addSessionToCookie: vi.fn(),
  updateSessionCookie: vi.fn(),
}));

vi.mock("@lib/zitadel", () => ({
  createSessionFromChecks: vi.fn(),
  getLoginSettings: vi.fn(),
  getSession: vi.fn(),
  getUserByID: vi.fn(),
  listAuthenticationMethodTypes: vi.fn(),
}));

vi.mock("@lib/logger", () => ({
  logMessage: { warn: vi.fn() },
}));

vi.mock("@lib/service-url", () => ({
  constructUrl: (_: NextRequest, path: string) => new URL(path, "https://portal.test"),
}));

describe("GET /password/reset/continue", () => {
  const userId = "user-123";
  const passwordChanged = timestampFromMs(1700000000123);
  const loginSettings = create(LoginSettingsSchema, {
    passwordCheckLifetime: { seconds: BigInt(3600), nanos: 0 },
  });
  const sign = () => signResetLink({ userId, passwordChanged });
  const request = (token?: string) => {
    const url = new URL("https://portal.test/password/reset/continue");
    if (token !== undefined) url.searchParams.set("token", token);
    return new NextRequest(url);
  };
  const expectResetRedirect = async (token?: string) => {
    const response = await GET(request(token));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://portal.test/password/reset");
    expect(addSessionToCookie).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
    vi.stubEnv("PASSWORD_RESET_SECRET", "password-reset-route-signing-secret");
    vi.mocked(getLoginSettings).mockResolvedValue(loginSettings);
    vi.mocked(getUserByID).mockResolvedValue(
      create(GetUserByIDResponseSchema, {
        user: create(UserSchema, {
          userId,
          state: UserState.ACTIVE,
          type: { case: "human", value: { passwordChanged } },
        }),
      })
    );
    vi.mocked(listAuthenticationMethodTypes).mockResolvedValue(
      create(ListAuthenticationMethodTypesResponseSchema, {
        authMethodTypes: [AuthenticationMethodType.TOTP],
      })
    );
    vi.mocked(createSessionFromChecks).mockResolvedValue(
      create(CreateSessionResponseSchema, { sessionId: "session-1", sessionToken: "session-token" })
    );
    vi.mocked(getSession).mockResolvedValue(
      create(GetSessionResponseSchema, {
        session: create(SessionSchema, {
          id: "session-1",
          factors: {
            user: {
              id: userId,
              loginName: "person@canada.ca",
              displayName: "Person",
              organizationId: "org-1",
            },
          },
        }),
      })
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("creates a basic session only after validation, stores it and redirects to MFA without a reset cookie", async () => {
    vi.mocked(createSessionFromChecks).mockImplementationOnce(async () => {
      expect(getUserByID).toHaveBeenCalledExactlyOnceWith(userId);
      expect(listAuthenticationMethodTypes).toHaveBeenCalledExactlyOnceWith(userId);
      return create(CreateSessionResponseSchema, {
        sessionId: "session-1",
        sessionToken: "session-token",
      });
    });

    const response = await GET(request(sign()));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://portal.test/password/reset/verify");
    expect(createSessionFromChecks).toHaveBeenCalledExactlyOnceWith({
      checks: create(ChecksSchema, {
        user: { search: { case: "userId", value: userId } },
      }),
      lifetime: loginSettings.passwordCheckLifetime,
      retry: false,
    });
    expect(getLoginSettings).toHaveBeenCalledExactlyOnceWith();
    expect(getSession).toHaveBeenCalledExactlyOnceWith("session-1", "session-token");
    expect(addSessionToCookie).toHaveBeenCalledExactlyOnceWith({
      session: {
        id: "session-1",
        token: "session-token",
        creationTs: "",
        expirationTs: "",
        changeTs: "",
        loginName: "person@canada.ca",
        displayName: "Person",
        userId,
        organization: "org-1",
      },
    });
  });

  it.each([undefined, "", "invalid", "invalid.signature"])(
    "uses the same reset redirect for missing or malformed token %s",
    async (token) => {
      await expectResetRedirect(token);
      expect(getUserByID).not.toHaveBeenCalled();
      expect(createSessionFromChecks).not.toHaveBeenCalled();
    }
  );

  it("rejects expired tokens without creating a session or looking up a user", async () => {
    const token = sign();
    vi.advanceTimersByTime(PASSWORD_RESET_TTL_SECONDS * 1000);
    await expectResetRedirect(token);
    expect(getUserByID).not.toHaveBeenCalled();
    expect(createSessionFromChecks).not.toHaveBeenCalled();
  });

  it("uses the same redirect for an invalid signature", async () => {
    const token = `${sign().split(".")[0]}.${"A".repeat(43)}`;
    await expectResetRedirect(token);
    expect(createSessionFromChecks).not.toHaveBeenCalled();
  });

  it("uses the same redirect if the user is no longer active", async () => {
    vi.mocked(getUserByID).mockResolvedValue(
      create(GetUserByIDResponseSchema, {
        user: create(UserSchema, {
          userId,
          state: UserState.INACTIVE,
          type: { case: "human", value: { passwordChanged } },
        }),
      })
    );
    await expectResetRedirect(sign());
    expect(createSessionFromChecks).not.toHaveBeenCalled();
  });

  it("uses the same redirect if strong MFA is no longer available", async () => {
    vi.mocked(listAuthenticationMethodTypes).mockResolvedValue(
      create(ListAuthenticationMethodTypesResponseSchema)
    );
    await expectResetRedirect(sign());
    expect(createSessionFromChecks).not.toHaveBeenCalled();
  });

  it("uses the same redirect when user lookup fails", async () => {
    vi.mocked(getUserByID).mockRejectedValue(new Error("Zitadel unavailable"));
    await expectResetRedirect(sign());
    expect(createSessionFromChecks).not.toHaveBeenCalled();
  });

  it("uses the same redirect when session creation fails", async () => {
    vi.mocked(createSessionFromChecks).mockRejectedValue(new Error("Session creation failed"));
    await expectResetRedirect(sign());
  });

  it("uses the same redirect when the new session cannot be loaded", async () => {
    vi.mocked(getSession).mockResolvedValue(create(GetSessionResponseSchema));
    await expectResetRedirect(sign());
  });

  it("uses the same redirect when session cookie storage fails", async () => {
    vi.mocked(addSessionToCookie).mockRejectedValue(new Error("Cookie storage failed"));
    const response = await GET(request(sign()));
    expect(response.headers.get("location")).toBe("https://portal.test/password/reset");
  });
});
