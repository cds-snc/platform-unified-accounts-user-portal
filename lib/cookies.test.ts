// @vitest-environment node
import { cookies } from "next/headers";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  addSessionToCookie,
  type Cookie,
  getActiveSessionCookie,
  getAllSessions,
  getSessionCookieById,
  getSessionCookieSecrets,
  MIN_SESSION_COOKIE_SECRET_LENGTH,
  readSessionCookies,
  removeSessionFromCookie,
  setSelectedSession,
  signSessions,
  updateSessionCookie,
  verifySessions,
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

  function stored(...sessions: Cookie[]) {
    return { value: JSON.stringify(signSessions(sessions)) };
  }

  function writtenSessions(): Cookie[] {
    const written = JSON.parse(mockCookies.set.mock.calls[0][0].value);
    expect(verifySessions(written)).toBe(true);
    expect(written.sessions.every((s: Cookie) => !("sig" in s))).toBe(true);
    return written.sessions;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", "test-session-cookie-secret-at-least-32-chars");
    mockCookies = { get: vi.fn(), set: vi.fn() };
    vi.mocked(cookies).mockResolvedValue(mockCookies as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("addSessionToCookie writes a signed session array", async () => {
    await addSessionToCookie({ session: { ...session } });

    const sessions = writtenSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject(session);
  });

  test("addSessionToCookie keeps existing entries and re-signs the array", async () => {
    mockCookies.get.mockReturnValue(stored({ ...otherSession, selectedSession: true }));

    await addSessionToCookie({ session: { ...session } });

    const sessions = writtenSessions();
    expect(sessions.map((s) => s.id)).toEqual([session.id, otherSession.id]);
    expect(sessions[1].selectedSession).toBe(false);
  });

  test("addSessionToCookie drops the entire tampered array", async () => {
    const forged = signSessions([otherSession, { ...otherSession, id: "session-3" }]);
    forged.sessions[0] = { ...otherSession, userId: "victim-user" };
    mockCookies.get.mockReturnValue({ value: JSON.stringify(forged) });

    await addSessionToCookie({ session: { ...session } });

    expect(writtenSessions().map((s) => s.id)).toEqual([session.id]);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "readSessionCookies: ignoring sessions cookie with a missing or invalid signature"
    );
  });

  test("addSessionToCookie replaces the oldest entry when the signed cookie would overflow", async () => {
    const manySessions: Cookie[] = Array.from({ length: 16 }, (_, i) => ({
      ...otherSession,
      id: `session-${i}`,
      token: `token-${i}-very-long-token-to-increase-size-padding-padding-padding`,
      loginName: `user${i}@example.com`,
    }));
    mockCookies.get.mockReturnValue(stored(...manySessions));

    await addSessionToCookie({ session: { ...session } });

    expect(mockLogger.warn).toHaveBeenCalledWith("WARNING COOKIE OVERFLOW");
    const sessions = writtenSessions();
    expect(sessions[0]).toMatchObject(session);
    expect(sessions.some((s) => s.id === manySessions[0].id)).toBe(false);
  });

  test.each([3499, 3500])(
    "addSessionToCookie checks the signed array size at %i characters",
    async (size) => {
      const newSession = { ...session };
      const baseSize = JSON.stringify(signSessions([otherSession, newSession])).length;
      newSession.displayName += "x".repeat(size - baseSize);
      expect(JSON.stringify(signSessions([otherSession, newSession]))).toHaveLength(size);
      mockCookies.get.mockReturnValue(stored(otherSession));

      await addSessionToCookie({ session: newSession });

      expect(writtenSessions().map((entry) => entry.id)).toEqual(
        size < 3500 ? [session.id, otherSession.id] : [session.id]
      );
      if (size < 3500) {
        expect(mockLogger.warn).not.toHaveBeenCalled();
      } else {
        expect(mockLogger.warn).toHaveBeenCalledWith("WARNING COOKIE OVERFLOW");
      }
    }
  );

  test("updateSessionCookie rejects an id that only exists in an unsigned entry", async () => {
    mockCookies.get.mockReturnValue({ value: JSON.stringify([session]) });

    await expect(updateSessionCookie({ id: session.id, session: { ...session } })).rejects.toBe(
      "updateSessionCookie<T>: session id now found"
    );
    expect(mockCookies.set).not.toHaveBeenCalled();
  });

  test("updateSessionCookie re-signs the session array", async () => {
    mockCookies.get.mockReturnValue(stored(session, otherSession));

    await updateSessionCookie({ id: session.id, session: { ...session, token: "new-token" } });

    const sessions = writtenSessions();
    expect(sessions.find((s) => s.id === session.id)?.token).toBe("new-token");
  });

  test("removeSessionFromCookie signs the remaining session array", async () => {
    mockCookies.get.mockReturnValue(stored(session, otherSession));

    await removeSessionFromCookie({ sessionId: session.id });

    const sessions = writtenSessions();
    expect(sessions.map((s) => s.id)).toEqual([otherSession.id]);
  });

  test("removeSessionFromCookie signs an empty array after removing the last session", async () => {
    mockCookies.get.mockReturnValue(stored(session));

    await removeSessionFromCookie({ sessionId: session.id });

    expect(writtenSessions()).toEqual([]);
  });

  test("getActiveSessionCookie ignores an unsigned selected entry", async () => {
    mockCookies.get.mockReturnValue({ value: JSON.stringify([session]) });

    await expect(getActiveSessionCookie()).rejects.toThrow("No active Session cookie found");
  });

  test("getActiveSessionCookie returns the selected entry without the array signature", async () => {
    mockCookies.get.mockReturnValue(stored(otherSession, session));

    await expect(getActiveSessionCookie()).resolves.toEqual(session);
  });

  test("getSessionCookieById only finds signed entries", async () => {
    mockCookies.get.mockReturnValue(stored(session));
    await expect(getSessionCookieById({ sessionId: session.id })).resolves.toEqual(session);

    mockCookies.get.mockReturnValue({ value: JSON.stringify([session]) });
    await expect(getSessionCookieById({ sessionId: session.id })).rejects.toBeUndefined();
  });

  test("getAllSessions returns all entries from a signed array", async () => {
    mockCookies.get.mockReturnValue(stored(session, otherSession));

    await expect(getAllSessions()).resolves.toEqual([session, otherSession]);
  });

  test("getAllSessions rejects all entries when one entry is tampered with", async () => {
    const signed = signSessions([session, otherSession]);
    mockCookies.get.mockReturnValue({
      value: JSON.stringify({
        ...signed,
        sessions: [session, { ...otherSession, userId: "victim-user" }],
      }),
    });

    await expect(getAllSessions()).resolves.toEqual([]);
  });

  test("getAllSessions returns an empty list for a malformed cookie", async () => {
    mockCookies.get.mockReturnValue({ value: "not-json" });

    await expect(getAllSessions()).resolves.toEqual([]);
  });

  test("setSelectedSession re-signs the array with the new selection", async () => {
    mockCookies.get.mockReturnValue(stored(session, otherSession));

    await setSelectedSession(otherSession.id);

    const sessions = writtenSessions();
    expect(sessions.find((s) => s.id === otherSession.id)?.selectedSession).toBe(true);
    expect(sessions.find((s) => s.id === session.id)?.selectedSession).toBe(false);
  });
});

const signableSession = {
  id: "session-1",
  token: "token-1",
  loginName: "user@example.com",
  displayName: "User",
  userId: "user-1",
  organization: "org-1",
  creationTs: "1700000000000",
  expirationTs: "1800000000000",
  changeTs: "1700000000000",
  selectedSession: true,
};

const OLD_SECRET = "old-secret-".padEnd(MIN_SESSION_COOKIE_SECRET_LENGTH, "o");
const NEW_SECRET = "new-secret-".padEnd(MIN_SESSION_COOKIE_SECRET_LENGTH, "n");

function unsetAllSecrets() {
  vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", undefined);
}

describe("session cookie signing", () => {
  beforeEach(() => {
    unsetAllSecrets();
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", "test-session-cookie-secret-at-least-32-chars");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("signs and verifies the entire session array", () => {
    const signed = signSessions([signableSession, otherSession]);

    expect(signed.sig).toEqual(expect.any(String));
    expect(verifySessions(signed)).toBe(true);
    expect(signed.sessions).toEqual([signableSession, otherSession]);
    expect(signed.sessions.every((entry) => !("sig" in entry))).toBe(true);
    expect(readSessionCookies(JSON.stringify(signed))).toEqual([signableSession, otherSession]);
  });

  test("rejects a missing signature", () => {
    expect(verifySessions({ sessions: [signableSession] })).toBe(false);
  });

  test.each<{ sessions: unknown[] }>([
    { sessions: [{ id: "", token: "" }] },
    { sessions: [{ arbitrary: "value" }] },
    { sessions: [null, "value", 123, true] },
  ])("signs arrays without requiring session fields: $sessions", ({ sessions }) => {
    const signed = signSessions(sessions);

    expect(verifySessions(signed)).toBe(true);
    expect(readSessionCookies(JSON.stringify(signed))).toEqual(sessions);
  });

  test("does not confuse field boundaries in the signed payload", () => {
    const signed = signSessions([{ ...signableSession, id: "ab", token: "c" }]);

    expect(
      verifySessions({ ...signed, sessions: [{ ...signableSession, id: "a", token: "bc" }] })
    ).toBe(false);
  });

  test("rejects a forged session id with an otherwise valid signature", () => {
    const signed = signSessions([signableSession]);

    expect(
      verifySessions({
        ...signed,
        sessions: [{ ...signableSession, id: "guessed-victim-session" }],
      })
    ).toBe(false);
  });

  test.each([
    ["token", "forged-token"],
    ["loginName", "other@example.com"],
    ["displayName", "Other User"],
    ["userId", "other-user"],
    ["organization", "other-org"],
    ["creationTs", "9999999999999"],
    ["changeTs", "9999999999999"],
    ["expirationTs", "9999999999999"],
    ["selectedSession", false],
    ["requestId", "injected-request"],
  ])("rejects the entire array when %s is tampered with", (field, value) => {
    const signed = signSessions([signableSession, otherSession]);
    signed.sessions[0] = { ...signableSession, [field]: value };

    expect(verifySessions(signed)).toBe(false);
    expect(readSessionCookies(JSON.stringify(signed))).toEqual([]);
  });

  test("preserves signatures across JSON round-trips with undefined optional fields", () => {
    const signed = signSessions([
      {
        ...signableSession,
        organization: undefined,
        requestId: undefined,
      },
    ]);

    const roundTripped = JSON.parse(JSON.stringify(signed));

    expect(roundTripped.sessions[0]).not.toHaveProperty("organization");
    expect(verifySessions(roundTripped)).toBe(true);
  });

  test("rejects a signature created with a different secret", () => {
    const signed = signSessions([signableSession]);
    vi.stubEnv(
      "ZITADEL_SESSION_COOKIE_SECRET",
      "other-secret-".padEnd(MIN_SESSION_COOKIE_SECRET_LENGTH, "x")
    );

    expect(verifySessions(signed)).toBe(false);
  });

  test.each(["insert", "remove", "reorder", "duplicate", "splice"])(
    "rejects the entire array after an entry %s",
    (operation) => {
      const signed = signSessions([signableSession, otherSession]);
      const anotherSigned = signSessions([{ ...otherSession, id: "session-3" }]);
      const changed = {
        insert: [...signed.sessions, anotherSigned.sessions[0]],
        remove: signed.sessions.slice(1),
        reorder: [...signed.sessions].reverse(),
        duplicate: [...signed.sessions, signed.sessions[0]],
        splice: [signed.sessions[0], anotherSigned.sessions[0]],
      }[operation];

      expect(readSessionCookies(JSON.stringify({ ...signed, sessions: changed }))).toEqual([]);
    }
  );

  test("rejects the legacy per-entry signed cookie format", () => {
    expect(
      readSessionCookies(JSON.stringify([{ ...signableSession, sig: "legacy-signature" }]))
    ).toEqual([]);
  });

  test("signs and verifies an empty session array", () => {
    const signed = signSessions([]);
    expect(verifySessions(signed)).toBe(true);
    expect(readSessionCookies(JSON.stringify(signed))).toEqual([]);
  });

  test.each([
    null,
    [],
    {},
    "invalid",
    { sessions: null, sig: "sig" },
    {
      sessions: [null],
      sig: "sig",
    },
    { sessions: [signableSession], sig: 123 },
    { sessions: [signableSession], sig: "" },
  ])("rejects a malformed signed cookie: %j", (value) => {
    expect(verifySessions(value)).toBe(false);
    expect(readSessionCookies(JSON.stringify(value))).toEqual([]);
  });

  test("rejects a modified signature", () => {
    const signed = signSessions([signableSession]);
    expect(verifySessions({ ...signed, sig: "x".repeat(signed.sig.length) })).toBe(false);
    expect(verifySessions({ ...signed, sig: "short" })).toBe(false);
  });

  test("returns an empty list for malformed cookie values", () => {
    expect(readSessionCookies("not-json")).toEqual([]);
    expect(readSessionCookies(JSON.stringify({ id: "session-1" }))).toEqual([]);
    expect(readSessionCookies(undefined)).toEqual([]);
  });

  test("supports secret rotation: signs with the first secret, verifies with all", () => {
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", OLD_SECRET);
    const signedWithOld = signSessions([signableSession]);

    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", `${NEW_SECRET}, ${OLD_SECRET}`);
    expect(verifySessions(signedWithOld)).toBe(true);
    const signedWithNew = signSessions([signableSession]);
    expect(signedWithNew.sig).not.toEqual(signedWithOld.sig);

    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", NEW_SECRET);
    expect(verifySessions(signedWithNew)).toBe(true);
    expect(verifySessions(signedWithOld)).toBe(false);
  });

  test("never falls back to the service user token", () => {
    unsetAllSecrets();
    vi.stubEnv("ZITADEL_SERVICE_USER_TOKEN", "service-user-token");
    vi.stubEnv("ZITADEL_SERVICE_USER_TOKEN_FILE", "/run/secrets/zitadel-token");

    expect(getSessionCookieSecrets()).toEqual([]);
    expect(() => signSessions([signableSession])).toThrow(/signing secret is not configured/);
  });

  test("does not verify when no signing secret is configured", () => {
    const signed = signSessions([signableSession]);
    unsetAllSecrets();

    expect(getSessionCookieSecrets()).toEqual([]);
    expect(verifySessions(signed)).toBe(false);
    expect(() => signSessions([signableSession])).toThrow(/signing secret is not configured/);
  });

  test("rejects a secret shorter than the minimum length", () => {
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", "too-short");
    vi.stubEnv("ZITADEL_SERVICE_USER_TOKEN", "service-user-token");

    expect(getSessionCookieSecrets()).toEqual([]);
    expect(() => signSessions([signableSession])).toThrow(/at least 32 characters/);
  });

  test("rejects the rotation list if any value is shorter than the minimum length", () => {
    const signed = signSessions([signableSession]);
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", `${NEW_SECRET},short`);

    expect(verifySessions(signed)).toBe(false);
  });

  test("accepts a dedicated secret of exactly the minimum length", () => {
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", "x".repeat(MIN_SESSION_COOKIE_SECRET_LENGTH));

    expect(verifySessions(signSessions([signableSession]))).toBe(true);
  });
});
