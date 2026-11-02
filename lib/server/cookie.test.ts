import { create, type Duration, timestampFromMs } from "@zitadel/client";
import { SessionSchema } from "@zitadel/proto/zitadel/session/v2/session_pb";
import {
  ChecksSchema,
  CreateSessionResponseSchema,
  GetSessionResponseSchema,
} from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { LoginSettingsSchema } from "@zitadel/proto/zitadel/settings/v2/login_settings_pb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { addSessionToCookie } from "@lib/cookies";
import { createSessionFromChecks, getLoginSettings, getSession } from "@lib/zitadel";

import { createSessionAndUpdateCookie } from "./cookie";

vi.mock("@lib/cookies", () => ({
  addSessionToCookie: vi.fn(),
  updateSessionCookie: vi.fn(),
}));

vi.mock("@lib/zitadel", () => ({
  createSessionFromChecks: vi.fn(),
  getLoginSettings: vi.fn(),
  getSession: vi.fn(),
  setSession: vi.fn(),
}));

describe("createSessionAndUpdateCookie", () => {
  const checks = create(ChecksSchema, { user: { search: { case: "userId", value: "user-1" } } });
  const passwordCheckLifetime: Duration = {
    $typeName: "google.protobuf.Duration",
    seconds: BigInt(3600),
    nanos: 0,
  };
  const creationDate = timestampFromMs(1700000000000);

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getLoginSettings).mockResolvedValue(
      create(LoginSettingsSchema, { passwordCheckLifetime })
    );
    vi.mocked(createSessionFromChecks).mockResolvedValue(
      create(CreateSessionResponseSchema, { sessionId: "session-1", sessionToken: "token-1" })
    );
    vi.mocked(getSession).mockResolvedValue(
      create(GetSessionResponseSchema, {
        session: create(SessionSchema, {
          id: "session-1",
          creationDate,
          changeDate: creationDate,
          expirationDate: timestampFromMs(1700003600000),
          factors: {
            user: {
              id: "user-1",
              loginName: "person@canada.ca",
              displayName: "Person",
              organizationId: "org-1",
            },
          },
        }),
      })
    );
  });

  it("preserves login settings, retry, request ID and session fields for existing callers", async () => {
    const session = await createSessionAndUpdateCookie({ checks, requestId: "req-1", retry: true });
    expect(session.id).toBe("session-1");
    expect(createSessionFromChecks).toHaveBeenCalledExactlyOnceWith({
      checks,
      lifetime: passwordCheckLifetime,
      retry: true,
    });
    expect(getSession).toHaveBeenCalledExactlyOnceWith("session-1", "token-1");
    expect(addSessionToCookie).toHaveBeenCalledExactlyOnceWith({
      session: {
        id: "session-1",
        token: "token-1",
        creationTs: "1700000000000",
        changeTs: "1700000000000",
        expirationTs: "1700003600000",
        loginName: "person@canada.ca",
        displayName: "Person",
        userId: "user-1",
        organization: "org-1",
        requestId: "req-1",
      },
    });
  });
});
