import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pollIntervalMs = 60_000;

describe("useVersionUpdater", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.resetModules();
  });

  it("only polls when the current tab is the leader tab", async () => {
    vi.doMock("./useLeaderTab", () => ({
      useLeaderTab: () => ({ isLeaderTab: false }),
    }));

    const { useVersionUpdater } = await import("./useVersionUpdater");
    renderHook(() => useVersionUpdater());

    vi.advanceTimersByTime(pollIntervalMs * 2);

    expect(fetch).not.toHaveBeenCalled();
  });

  it("stores full and short versions after a successful leader-tab poll", async () => {
    vi.doMock("./useLeaderTab", () => ({
      useLeaderTab: () => ({ isLeaderTab: true }),
    }));

    vi.mocked(fetch).mockResolvedValue(
      new Response("abcdef1234567890", {
        status: 200,
        headers: { "content-type": "text/plain" },
      })
    );

    const { useVersionUpdater } = await import("./useVersionUpdater");
    const { result } = renderHook(() => useVersionUpdater());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    expect(result.current).toEqual({
      latestVersion: "abcdef1234567890",
      previousVersion: null,
      latestShortVersion: "abcdef1",
      previousShortVersion: null,
      didChange: false,
    });

    vi.mocked(fetch).mockResolvedValue(
      new Response("1234567890abcdef", {
        status: 200,
        headers: { "content-type": "text/plain" },
      })
    );

    await act(async () => {
      vi.advanceTimersByTime(pollIntervalMs);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.didChange).toBe(true);

    expect(result.current).toEqual({
      latestVersion: "1234567890abcdef",
      previousVersion: "abcdef1234567890",
      latestShortVersion: "1234567",
      previousShortVersion: "abcdef1",
      didChange: true,
    });
  });
});
