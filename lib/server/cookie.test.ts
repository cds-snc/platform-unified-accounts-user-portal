import { Code, ConnectError } from "@connectrpc/connect";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { addSessionToCookie } from "@lib/cookies";
import { createSessionFromChecks, getSession } from "@lib/zitadel";

import { createSessionAndUpdateCookieWithRetry } from "./cookie";

vi.mock("@lib/logger", () => ({
  logMessage: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@lib/cookies", () => ({
  addSessionToCookie: vi.fn(),
  updateSessionCookie: vi.fn(),
}));

vi.mock("@lib/zitadel", () => ({
  createSessionFromChecks: vi.fn(),
  getSession: vi.fn(),
  setSession: vi.fn(),
}));

describe("createSessionAndUpdateCookieWithRetry", () => {
  const command = {
    checks: {} as never,
    requestId: "req-123",
    lifetime: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries NotFound errors until the session is created", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      handler: TimerHandler
    ) => {
      if (typeof handler === "function") {
        handler();
      }

      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);

    vi.mocked(createSessionFromChecks)
      .mockRejectedValueOnce(new ConnectError("not found", Code.NotFound))
      .mockRejectedValueOnce(new ConnectError("not found", Code.NotFound))
      .mockResolvedValueOnce({ sessionId: "session-123", sessionToken: "token-123" } as never);

    vi.mocked(getSession).mockResolvedValue({
      session: {
        creationDate: new Date("2026-01-01T00:00:00.000Z"),
        changeDate: new Date("2026-01-01T00:00:00.000Z"),
        expirationDate: new Date("2026-01-01T01:00:00.000Z"),
        factors: {
          user: {
            id: "user-123",
            loginName: "person@canada.ca",
            organizationId: "org-123",
          },
        },
      },
    } as never);

    vi.mocked(addSessionToCookie).mockResolvedValue(undefined as never);

    const result = await createSessionAndUpdateCookieWithRetry(command, [10, 20]);

    expect(result).toEqual(
      expect.objectContaining({
        factors: expect.objectContaining({
          user: expect.objectContaining({
            loginName: "person@canada.ca",
          }),
        }),
      })
    );
    expect(createSessionFromChecks).toHaveBeenCalledTimes(3);
    expect(getSession).toHaveBeenCalledTimes(1);
    expect(addSessionToCookie).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(1, expect.any(Function), 10);
    expect(setTimeoutSpy).toHaveBeenNthCalledWith(2, expect.any(Function), 20);

    setTimeoutSpy.mockRestore();
  });

  it("does not retry non-NotFound errors", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      handler: TimerHandler
    ) => {
      if (typeof handler === "function") {
        handler();
      }

      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);

    vi.mocked(createSessionFromChecks).mockRejectedValue(
      new ConnectError("internal", Code.Internal)
    );

    await expect(createSessionAndUpdateCookieWithRetry(command, [10, 20])).rejects.toBeInstanceOf(
      ConnectError
    );
    expect(createSessionFromChecks).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).not.toHaveBeenCalled();

    setTimeoutSpy.mockRestore();
  });

  it("throws after exhausting all NotFound retries", async () => {
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout").mockImplementation(((
      handler: TimerHandler
    ) => {
      if (typeof handler === "function") {
        handler();
      }

      return 0 as ReturnType<typeof setTimeout>;
    }) as typeof setTimeout);

    vi.mocked(createSessionFromChecks).mockRejectedValue(
      new ConnectError("not found", Code.NotFound)
    );

    await expect(
      createSessionAndUpdateCookieWithRetry(command, [10, 20, 30])
    ).rejects.toBeInstanceOf(ConnectError);
    expect(createSessionFromChecks).toHaveBeenCalledTimes(4);
    expect(setTimeoutSpy).toHaveBeenCalledTimes(3);

    setTimeoutSpy.mockRestore();
  });
});
