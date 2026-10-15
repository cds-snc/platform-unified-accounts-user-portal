import { Code, ConnectError } from "@connectrpc/connect";
import type { Duration } from "@zitadel/client";
import { create } from "@zitadel/client";
import { UserAgentSchema } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionFromChecks, getSession, setSession } from "./zitadel";

vi.mock("@lib/cookies", () => ({
  getActiveSessionCookie: vi.fn(),
  updateSessionCookie: vi.fn(),
}));

vi.mock("@lib/server/host", () => ({
  getOriginalHost: vi.fn().mockResolvedValue("idp.example"),
}));

vi.mock("@lib/service", () => ({
  getServiceForHost: vi.fn(),
}));

vi.mock("./fingerprint", () => ({
  getUserAgent: vi.fn(),
}));

vi.mock("./logger", () => ({
  logMessage: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@i18n/server", () => ({
  serverTranslation: vi.fn(),
}));

describe("createSessionFromChecks", () => {
  const mockCreateSession = vi.fn();
  const typedChecks = create(ChecksSchema, {});
  const typedLifetime: Duration = {
    $typeName: "google.protobuf.Duration",
    seconds: BigInt(60),
    nanos: 0,
  };
  const typedUserAgent = create(UserAgentSchema, {
    description: "test-agent",
    header: {},
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    const { getServiceForHost } = await import("@lib/service");
    const { getUserAgent } = await import("./fingerprint");

    vi.mocked(getServiceForHost).mockResolvedValue({
      createSession: mockCreateSession,
    });
    vi.mocked(getUserAgent).mockResolvedValue(typedUserAgent);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not retry by default", async () => {
    const error = new ConnectError("not found", Code.NotFound);
    mockCreateSession.mockRejectedValueOnce(error);

    await expect(
      createSessionFromChecks({
        checks: typedChecks,
        lifetime: typedLifetime,
      })
    ).rejects.toBe(error);

    expect(mockCreateSession).toHaveBeenCalledTimes(1);
  });

  it("retries NotFound errors when enabled", async () => {
    const error = new ConnectError("not found", Code.NotFound);
    mockCreateSession
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        sessionId: "session-123",
        sessionToken: "token-123",
      });

    const sessionPromise = createSessionFromChecks({
      checks: typedChecks,
      lifetime: typedLifetime,
      retry: true,
    });

    await vi.runAllTimersAsync();

    await expect(sessionPromise).resolves.toEqual({
      sessionId: "session-123",
      sessionToken: "token-123",
    });

    expect(mockCreateSession).toHaveBeenCalledTimes(3);
  });
});

describe("session metadata", () => {
  const mockSetSession = vi.fn();
  const mockGetSession = vi.fn();
  const lifetime: Duration = {
    $typeName: "google.protobuf.Duration",
    seconds: BigInt(60),
    nanos: 0,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { getServiceForHost } = await import("@lib/service");
    vi.mocked(getServiceForHost).mockResolvedValue({
      setSession: mockSetSession,
      getSession: mockGetSession,
    });
  });

  it("forwards metadata when updating a session", async () => {
    const metadata = { emailVerifiedInSession: new Uint8Array([1]) };
    await setSession({
      sessionId: "session-123",
      sessionToken: "token-123",
      challenges: undefined,
      lifetime,
      metadata,
    });

    expect(mockSetSession).toHaveBeenCalledWith(expect.objectContaining({ metadata }), {});
  });

  it("defaults to empty metadata for existing callers", async () => {
    await setSession({
      sessionId: "session-123",
      sessionToken: "token-123",
      challenges: undefined,
      lifetime,
    });

    expect(mockSetSession).toHaveBeenCalledWith(expect.objectContaining({ metadata: {} }), {});
  });

  it("preserves the Buffer metadata marker through session serialization", async () => {
    mockGetSession.mockResolvedValue({
      session: { metadata: { emailVerifiedInSession: Buffer.from([1]) } },
    });

    const response = await getSession("session-123", "token-123");

    expect(response.session?.metadata.emailVerifiedInSession[0]).toBe(1);
    expect(response.session?.metadata.emailVerifiedInSession).toEqual([1]);
  });
});
