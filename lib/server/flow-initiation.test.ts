import { NextRequest } from "next/server";
import { Prompt } from "@zitadel/proto/zitadel/oidc/v2/authorization_pb";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Cookie } from "@lib/cookies";
import { loginWithOIDCAndSession } from "@lib/oidc";
import { getAuthRequest } from "@lib/zitadel";

import { handleOIDCFlowInitiation } from "./flow-initiation";

vi.mock("@lib/oidc", () => ({
  loginWithOIDCAndSession: vi.fn(),
}));

vi.mock("@lib/zitadel", () => ({
  createCallback: vi.fn(),
  getActiveIdentityProviders: vi.fn(),
  getAuthRequest: vi.fn(),
  startIdentityProviderFlow: vi.fn(),
}));

vi.mock("@lib/server/loginname", () => ({
  sendLoginname: vi.fn(),
}));

vi.mock("@lib/session", () => ({
  findValidSession: vi.fn(),
}));

vi.mock("@lib/logger", () => ({
  logMessage: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@lib/idp", () => ({
  idpTypeToSlug: vi.fn(),
}));

const requestId = "oidc_auth-request-123";
const request = new NextRequest(`http://localhost:3002/login?requestId=${requestId}`, {
  headers: { host: "localhost:3002" },
});

const createFlowParams = (sessionCookies: Cookie[] = [], sessions: Session[] = []) => ({
  requestId,
  request,
  sessionCookies,
  sessions,
});

describe("handleOIDCFlowInitiation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthRequest).mockResolvedValue({
      authRequest: {
        id: "auth-request-123",
        prompt: [Prompt.CREATE],
      },
    } as never);
  });

  it("completes a create flow for the session created by registration", async () => {
    vi.mocked(loginWithOIDCAndSession).mockResolvedValue({
      redirect: "https://forms.example/callback?code=abc",
    });

    const response = await handleOIDCFlowInitiation(
      createFlowParams(
        [{ id: "session-123", requestId } as Cookie],
        [{ id: "session-123" } as Session]
      )
    );

    expect(loginWithOIDCAndSession).toHaveBeenCalledWith({
      authRequest: requestId,
      sessionId: "session-123",
      sessions: [{ id: "session-123" }],
      sessionCookies: [{ id: "session-123", requestId }],
    });
    expect(response.headers.get("location")).toBe("https://forms.example/callback?code=abc");
  });
});
