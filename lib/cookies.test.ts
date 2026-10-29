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
  parseAndVerifySessions,
  removeSessionFromCookie,
  setSelectedSession,
  signSession,
  stripSessionSignature,
  updateSessionCookie,
  verifySession,
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
    return { value: JSON.stringify(sessions.map((s) => signSession(s))) };
  }

  function writtenSessions(): Array<Cookie & { sig: string }> {
    return JSON.parse(mockCookies.set.mock.calls[0][0].value);
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

  test("addSessionToCookie writes signed entries", async () => {
    await addSessionToCookie({ session: { ...session } });

    const sessions = writtenSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject(session);
    expect(verifySession(sessions[0])).toBe(true);
  });

  test("addSessionToCookie keeps existing signed entries and re-signs them", async () => {
    mockCookies.get.mockReturnValue(stored({ ...otherSession, selectedSession: true }));

    await addSessionToCookie({ session: { ...session } });

    const sessions = writtenSessions();
    expect(sessions.map((s) => s.id)).toEqual([session.id, otherSession.id]);
    expect(sessions[1].selectedSession).toBe(false);
    expect(sessions.every(verifySession)).toBe(true);
  });

  test("addSessionToCookie drops unsigned and tampered entries", async () => {
    const forged = { ...signSession(otherSession), userId: "victim-user" };
    mockCookies.get.mockReturnValue({ value: JSON.stringify([forged, { ...otherSession }]) });

    await addSessionToCookie({ session: { ...session } });

    expect(writtenSessions().map((s) => s.id)).toEqual([session.id]);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("ignoring 2 session cookie entries")
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

  test("updateSessionCookie rejects an id that only exists in an unsigned entry", async () => {
    mockCookies.get.mockReturnValue({ value: JSON.stringify([session]) });

    await expect(updateSessionCookie({ id: session.id, session: { ...session } })).rejects.toBe(
      "updateSessionCookie<T>: session id now found"
    );
    expect(mockCookies.set).not.toHaveBeenCalled();
  });

  test("updateSessionCookie writes signed entries", async () => {
    mockCookies.get.mockReturnValue(stored(session, otherSession));

    await updateSessionCookie({ id: session.id, session: { ...session, token: "new-token" } });

    const sessions = writtenSessions();
    expect(sessions.find((s) => s.id === session.id)?.token).toBe("new-token");
    expect(sessions.every(verifySession)).toBe(true);
  });

  test("removeSessionFromCookie keeps only the remaining signed entries", async () => {
    mockCookies.get.mockReturnValue(stored(session, otherSession));

    await removeSessionFromCookie({ sessionId: session.id });

    const sessions = writtenSessions();
    expect(sessions.map((s) => s.id)).toEqual([otherSession.id]);
    expect(sessions.every(verifySession)).toBe(true);
  });

  test("getActiveSessionCookie ignores an unsigned selected entry", async () => {
    mockCookies.get.mockReturnValue({ value: JSON.stringify([session]) });

    await expect(getActiveSessionCookie()).rejects.toThrow("No active Session cookie found");
  });

  test("getActiveSessionCookie returns the signed selected entry without its signature", async () => {
    mockCookies.get.mockReturnValue(stored(otherSession, session));

    await expect(getActiveSessionCookie()).resolves.toEqual(session);
  });

  test("getSessionCookieById only finds signed entries", async () => {
    mockCookies.get.mockReturnValue(stored(session));
    await expect(getSessionCookieById({ sessionId: session.id })).resolves.toEqual(session);

    mockCookies.get.mockReturnValue({ value: JSON.stringify([session]) });
    await expect(getSessionCookieById({ sessionId: session.id })).rejects.toBeUndefined();
  });

  test("getAllSessions returns only signed entries", async () => {
    mockCookies.get.mockReturnValue({
      value: JSON.stringify([signSession(session), { ...otherSession }]),
    });

    await expect(getAllSessions()).resolves.toEqual([session]);
  });

  test("getAllSessions returns an empty list for a malformed cookie", async () => {
    mockCookies.get.mockReturnValue({ value: "not-json" });

    await expect(getAllSessions()).resolves.toEqual([]);
  });

  test("setSelectedSession re-signs entries with the new selection", async () => {
    mockCookies.get.mockReturnValue(stored(session, otherSession));

    await setSelectedSession(otherSession.id);

    const sessions = writtenSessions();
    expect(sessions.find((s) => s.id === otherSession.id)?.selectedSession).toBe(true);
    expect(sessions.find((s) => s.id === session.id)?.selectedSession).toBe(false);
    expect(sessions.every(verifySession)).toBe(true);
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

  test("signs and verifies a session", () => {
    const signed = signSession(signableSession);

    expect(signed.sig).toEqual(expect.any(String));
    expect(verifySession(signed)).toBe(true);
    expect(stripSessionSignature(signed)).toEqual(signableSession);
  });

  test("rejects a missing signature", () => {
    expect(verifySession(signableSession)).toBe(false);
  });

  test("rejects entries with an empty id or token even if correctly signed", () => {
    expect(() => signSession({ ...signableSession, token: "" })).toThrow(/non-empty id and token/);
    expect(() => signSession({ ...signableSession, id: "" })).toThrow(/non-empty id and token/);

    const signed = signSession(signableSession);
    expect(verifySession({ ...signed, token: "" })).toBe(false);
  });

  test("does not confuse field boundaries in the signed payload", () => {
    const signed = signSession({ ...signableSession, id: "ab", token: "c" });

    expect(verifySession({ ...signed, id: "a", token: "bc" })).toBe(false);
  });

  test("rejects a forged session id with an otherwise valid signature", () => {
    const signed = signSession(signableSession);

    expect(verifySession({ ...signed, id: "guessed-victim-session" })).toBe(false);
  });

  test("covers all fields of the entry, not only id and token", () => {
    const signed = signSession(signableSession);

    expect(verifySession({ ...signed, loginName: "other@example.com" })).toBe(false);
    expect(verifySession({ ...signed, userId: "other-user" })).toBe(false);
    expect(verifySession({ ...signed, organization: "other-org" })).toBe(false);
    expect(verifySession({ ...signed, changeTs: "9999999999999" })).toBe(false);
    expect(verifySession({ ...signed, expirationTs: "9999999999999" })).toBe(false);
    expect(verifySession({ ...signed, selectedSession: false })).toBe(false);
    expect(verifySession({ ...signed, requestId: "injected-request" })).toBe(false);
  });

  test("is independent of key order and of undefined optional fields", () => {
    const signed = signSession({
      ...signableSession,
      organization: undefined,
      requestId: undefined,
    });

    // simulate the JSON round-trip through the cookie: undefined keys disappear, key order may change
    const roundTripped = JSON.parse(JSON.stringify(signed));
    const reordered = Object.fromEntries(Object.entries(roundTripped).reverse());

    expect(roundTripped).not.toHaveProperty("organization");
    expect(verifySession(roundTripped)).toBe(true);
    expect(verifySession(reordered)).toBe(true);
  });

  test("rejects a signature created with a different secret", () => {
    const signed = signSession(signableSession);
    vi.stubEnv(
      "ZITADEL_SESSION_COOKIE_SECRET",
      "other-secret-".padEnd(MIN_SESSION_COOKIE_SECRET_LENGTH, "x")
    );

    expect(verifySession(signed)).toBe(false);
  });

  test("drops unsigned and tampered entries when parsing a cookie", () => {
    const valid = signSession(signableSession);
    const forged = { ...signableSession, id: "stolen-or-guessed-id", token: "", sig: valid.sig };

    expect(parseAndVerifySessions(JSON.stringify([forged, valid, signableSession]))).toEqual([
      signableSession,
    ]);
  });

  test("returns an empty list for malformed cookie values", () => {
    expect(parseAndVerifySessions("not-json")).toEqual([]);
    expect(parseAndVerifySessions(JSON.stringify({ id: "session-1" }))).toEqual([]);
    expect(parseAndVerifySessions(undefined)).toEqual([]);
  });

  test("supports secret rotation: signs with the first secret, verifies with all", () => {
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", OLD_SECRET);
    const signedWithOld = signSession(signableSession);

    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", `${NEW_SECRET}, ${OLD_SECRET}`);
    expect(verifySession(signedWithOld)).toBe(true);
    const signedWithNew = signSession(signableSession);
    expect(signedWithNew.sig).not.toEqual(signedWithOld.sig);

    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", NEW_SECRET);
    expect(verifySession(signedWithNew)).toBe(true);
    expect(verifySession(signedWithOld)).toBe(false);
  });

  test("never falls back to the service user token", () => {
    unsetAllSecrets();
    vi.stubEnv("ZITADEL_SERVICE_USER_TOKEN", "service-user-token");
    vi.stubEnv("ZITADEL_SERVICE_USER_TOKEN_FILE", "/run/secrets/zitadel-token");

    expect(getSessionCookieSecrets()).toEqual([]);
    expect(() => signSession(signableSession)).toThrow(/signing secret is not configured/);
  });

  test("does not verify when no signing secret is configured", () => {
    const signed = signSession(signableSession);
    unsetAllSecrets();

    expect(getSessionCookieSecrets()).toEqual([]);
    expect(verifySession(signed)).toBe(false);
    expect(() => signSession(signableSession)).toThrow(/signing secret is not configured/);
  });

  test("rejects a secret shorter than the minimum length", () => {
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", "too-short");
    vi.stubEnv("ZITADEL_SERVICE_USER_TOKEN", "service-user-token");

    expect(getSessionCookieSecrets()).toEqual([]);
    expect(() => signSession(signableSession)).toThrow(/at least 32 characters/);
  });

  test("rejects the rotation list if any value is shorter than the minimum length", () => {
    const signed = signSession(signableSession);
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", `${NEW_SECRET},short`);

    expect(verifySession(signed)).toBe(false);
  });

  test("accepts a dedicated secret of exactly the minimum length", () => {
    vi.stubEnv("ZITADEL_SESSION_COOKIE_SECRET", "x".repeat(MIN_SESSION_COOKIE_SECRET_LENGTH));

    expect(verifySession(signSession(signableSession))).toBe(true);
  });
});
