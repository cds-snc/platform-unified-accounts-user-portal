// @vitest-environment node
import { cookies } from "next/headers";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  addSessionToCookie,
  type Cookie,
  getActiveSessionCookie,
  getAllSessions,
  getSessionCookieById,
  removeSessionFromCookie,
  setSelectedSession,
  updateSessionCookie,
} from "./cookies";

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));
vi.mock("./logger", () => ({
  logMessage: mockLogger,
}));
vi.mock("@root/constants/config", () => ({
  ZITADEL_ORGANIZATION: "org-1",
}));

const SESSION_COOKIE_SECRET = "test-session-cookie-secret-at-least-32-chars";

const session: Cookie = {
  id: "session-1",
  token: "token-1",
  loginName: "user@example.com",
  displayName: "User",
  userId: "user-1",
  organization: "org-1",
  creationTs: "1700000000000",
  expirationTs: "",
  changeTs: "1700000000000",
  selectedSession: true,
};

const otherSession: Cookie = {
  ...session,
  id: "session-2",
  token: "token-2",
  loginName: "other@example.com",
  userId: "user-2",
  selectedSession: false,
};

describe("cookies", () => {
  let mockCookies: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  function lastWrittenValue(): string {
    return mockCookies.set.mock.lastCall?.[0].value;
  }

  async function seedSessions(...sessions: Cookie[]): Promise<string> {
    let value: string | undefined;

    for (const entry of sessions) {
      mockCookies.get.mockReturnValue(value ? { value } : undefined);
      // Each write reads the cookie produced by the previous write.
      // eslint-disable-next-line no-await-in-loop
      await addSessionToCookie({ session: { ...entry } });
      value = lastWrittenValue();
    }

    mockCookies.set.mockClear();
    mockCookies.get.mockReturnValue(value ? { value } : undefined);
    if (!value) {
      throw new Error("Expected seeded sessions to be written");
    }
    return value;
  }

  async function writtenSessions(): Promise<Cookie[]> {
    const value = lastWrittenValue();
    expect(value).toBeDefined();

    const cookie = JSON.parse(value) as { sessions: Cookie[]; sig: string };
    expect(cookie.sig).toEqual(expect.any(String));

    mockCookies.get.mockReturnValue({ value });
    return getAllSessions();
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", SESSION_COOKIE_SECRET);
    mockCookies = { get: vi.fn(), set: vi.fn() };
    vi.mocked(cookies).mockResolvedValue(mockCookies as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("adds and reads sessions, selecting the newest session", async () => {
    const value = await seedSessions(session, otherSession);
    const cookie = JSON.parse(value) as { sig: string };
    expect(cookie.sig).toEqual(expect.any(String));
    mockCookies.get.mockReturnValue({ value });

    const sessions = await getAllSessions();
    expect(sessions.map(({ id }) => id)).toEqual([otherSession.id, session.id]);
    expect(sessions.map(({ selectedSession }) => selectedSession)).toEqual([true, false]);
    await expect(getActiveSessionCookie()).resolves.toMatchObject({ id: otherSession.id });
  });

  test("replaces a session with the same login name", async () => {
    await seedSessions(session);

    await addSessionToCookie({ session: { ...session, token: "updated-token" } });

    await expect(writtenSessions()).resolves.toMatchObject([
      { id: session.id, token: "updated-token" },
    ]);
  });

  test("replaces the first stored session when adding one would exceed the cookie size limit", async () => {
    const existingSessions = Array.from({ length: 4 }, (_, index) => ({
      ...otherSession,
      id: `existing-${index}`,
      loginName: `user${index}@example.com`,
      displayName: "x".repeat(350),
    }));
    await seedSessions(...existingSessions);

    await addSessionToCookie({
      session: { ...session, displayName: "x".repeat(2500) },
    });

    const sessions = await writtenSessions();
    expect(sessions[0]).toMatchObject({ id: session.id });
    expect(sessions.some(({ id }) => id === existingSessions[3].id)).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith("WARNING COOKIE OVERFLOW");
  });

  test("updates a session and rejects an id that is not present", async () => {
    await seedSessions(session, otherSession);

    await updateSessionCookie({
      id: session.id,
      session: { ...session, token: "updated-token" },
    });
    await expect(writtenSessions()).resolves.toMatchObject([
      { id: otherSession.id, selectedSession: false },
      { id: session.id, token: "updated-token", selectedSession: true },
    ]);

    mockCookies.set.mockClear();
    await expect(updateSessionCookie({ id: "missing", session: { ...session } })).rejects.toBe(
      "updateSessionCookie<T>: session id now found"
    );
    expect(mockCookies.set).not.toHaveBeenCalled();
  });

  test("removes sessions, including the last remaining session", async () => {
    await seedSessions(session, otherSession);

    await removeSessionFromCookie({ sessionId: session.id });
    await expect(writtenSessions()).resolves.toMatchObject([{ id: otherSession.id }]);

    await removeSessionFromCookie({ sessionId: otherSession.id });
    await expect(writtenSessions()).resolves.toEqual([]);
  });

  test("selects a session and looks up sessions by id", async () => {
    await seedSessions(session, otherSession);

    await setSelectedSession(session.id);
    await writtenSessions();
    await expect(getActiveSessionCookie()).resolves.toMatchObject({ id: session.id });
    await expect(getSessionCookieById({ sessionId: otherSession.id })).resolves.toMatchObject({
      id: otherSession.id,
    });
    await expect(getSessionCookieById({ sessionId: "missing" })).rejects.toBeUndefined();
  });

  test("filters expired sessions when cleanup is requested", async () => {
    await seedSessions(
      { ...session, expirationTs: "1" },
      { ...otherSession, expirationTs: "4102444800000" }
    );

    await expect(getAllSessions(true)).resolves.toMatchObject([{ id: otherSession.id }]);
  });

  test.each([
    ["malformed JSON", "not-json"],
    ["unsigned data", JSON.stringify([session])],
  ])("returns no sessions for %s", async (_description, value) => {
    mockCookies.get.mockReturnValue({ value });

    await expect(getAllSessions()).resolves.toEqual([]);
  });

  test("ignores a cookie whose session data was tampered with", async () => {
    const cookie = JSON.parse(await seedSessions(session, otherSession)) as {
      sessions: Cookie[];
      sig: string;
    };
    cookie.sessions[0].userId = "forged-user";
    mockCookies.get.mockReturnValue({ value: JSON.stringify(cookie) });

    await expect(getAllSessions()).resolves.toEqual([]);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "readSessionCookies: ignoring sessions cookie with a missing or invalid signature"
    );
  });

  test("supports secret rotation and rejects cookies after the old secret is removed", async () => {
    const cookieFromOldSecret = { value: await seedSessions(session) };

    vi.stubEnv(
      "ZITADEL_SESSION_COOKIE_SECRET",
      `new-session-cookie-secret-at-least-32-chars, ${SESSION_COOKIE_SECRET}`
    );
    mockCookies.get.mockReturnValue(cookieFromOldSecret);
    await expect(getAllSessions()).resolves.toMatchObject([{ id: session.id }]);

    await addSessionToCookie({ session: { ...otherSession } });
    const cookieFromNewSecret = { value: lastWrittenValue() };
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", "new-session-cookie-secret-at-least-32-chars");
    mockCookies.get.mockReturnValue(cookieFromNewSecret);
    await expect(getAllSessions()).resolves.toMatchObject([
      { id: otherSession.id },
      { id: session.id },
    ]);

    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", SESSION_COOKIE_SECRET);
    await expect(getAllSessions()).resolves.toEqual([]);
  });

  test("requires a valid secret to write sessions", async () => {
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", "too-short");

    await expect(addSessionToCookie({ session: { ...session } })).rejects.toThrow(
      /at least 32 characters/
    );
    expect(mockCookies.set).not.toHaveBeenCalled();
  });
});
