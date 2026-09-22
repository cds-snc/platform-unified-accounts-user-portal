import { create } from "@zitadel/client";
import { CreateCallbackResponseSchema } from "@zitadel/proto/zitadel/oidc/v2/oidc_service_pb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockRedirect } from "@root/test/mocks/next/navigation";
import { createCallback } from "@lib/zitadel";

import { loginWithOIDCAndSession } from "./oidc";
import { isSessionValid } from "./session";

vi.mock("@lib/logger", () => ({
  logMessage: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@lib/zitadel", () => ({
  createCallback: vi.fn(),
  getAuthRequest: vi.fn(),
  getLoginSettings: vi.fn(),
}));

vi.mock("./session", () => ({
  isSessionValid: vi.fn(),
}));

describe("loginWithOIDCAndSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a callback for a valid session", async () => {
    vi.mocked(isSessionValid).mockResolvedValue(true);
    vi.mocked(createCallback).mockResolvedValue(
      create(CreateCallbackResponseSchema, { callbackUrl: "/account" })
    );

    const result = await loginWithOIDCAndSession({
      authRequest: "oidc_auth-request-123",

      session: {
        id: "session-123",
      } as never,

      cookie: {
        id: "session-123",
        token: "session-token",
      } as never,
    });

    expect(result).toEqual({ redirect: "/account" });
    expect(createCallback).toHaveBeenCalledWith({
      req: expect.objectContaining({
        authRequestId: "auth-request-123",
        callbackKind: expect.objectContaining({
          case: "session",
          value: expect.objectContaining({
            sessionId: "session-123",
            sessionToken: "session-token",
          }),
        }),
      }),
    });
  });

  it("does not create a callback for an incomplete registration session", async () => {
    vi.mocked(isSessionValid).mockResolvedValue(false);

    await expect(
      loginWithOIDCAndSession({
        authRequest: "oidc_auth-request-123",
        session: {
          id: "session-123",
          factors: {
            user: {
              id: "user-123",
              loginName: "user@example.com",
            },
          },
        } as never,

        cookie: {
          id: "session-123",
          token: "session-token",
        } as never,
      })
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/?requestId=oidc_auth-request-123");
    expect(createCallback).not.toHaveBeenCalled();
  });
});
