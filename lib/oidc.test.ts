import { create } from "@zitadel/client";
import { CreateCallbackResponseSchema } from "@zitadel/proto/zitadel/oidc/v2/oidc_service_pb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { sendLoginname } from "@lib/server/loginname";
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

vi.mock("@lib/server/loginname", () => ({
  sendLoginname: vi.fn(),
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
      sessionId: "session-123",
      sessions: [
        {
          id: "session-123",
        } as never,
      ],
      sessionCookies: [
        {
          id: "session-123",
          token: "session-token",
        } as never,
      ],
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
    expect(sendLoginname).not.toHaveBeenCalled();
  });

  it("does not create a callback for an incomplete registration session", async () => {
    vi.mocked(isSessionValid).mockResolvedValue(false);
    vi.mocked(sendLoginname).mockResolvedValue({ error: "Registration is incomplete" });

    const result = await loginWithOIDCAndSession({
      authRequest: "oidc_auth-request-123",
      sessionId: "session-123",
      sessions: [
        {
          id: "session-123",
          factors: {
            user: {
              id: "user-123",
              loginName: "user@example.com",
            },
          },
        } as never,
      ],
      sessionCookies: [
        {
          id: "session-123",
          token: "session-token",
        } as never,
      ],
    });

    expect(result).toEqual({ error: "Registration is incomplete" });
    expect(sendLoginname).toHaveBeenCalledWith({
      loginName: "user@example.com",
      requestId: "oidc_auth-request-123",
    });
    expect(createCallback).not.toHaveBeenCalled();
  });
});
