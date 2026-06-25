import { Code, ConnectError } from "@connectrpc/connect";
import type { Duration } from "@zitadel/client";
import { create } from "@zitadel/client";
import { UserAgentSchema } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionFromChecks } from "./zitadel";

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
