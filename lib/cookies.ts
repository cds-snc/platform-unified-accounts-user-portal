/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { cookies } from "next/headers";
import { timestampDate, timestampFromMs } from "@zitadel/client";
import { createHmac, hkdfSync, timingSafeEqual } from "node:crypto";

import { ZITADEL_ORGANIZATION } from "@root/constants/config";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { logMessage } from "./logger";

import "server-only";

// TODO: improve this to handle overflow
const MAX_COOKIE_SIZE = 3500;
const SIGNATURE_VERSION = "v1";
const HKDF_INFO = `session-cookie-${SIGNATURE_VERSION}`;
const DERIVED_KEY_LENGTH = 32;

export const MIN_SESSION_COOKIE_SECRET_LENGTH = 32;

export type SignableSession = {
  id: string;
  token: string;
  sig?: string;
};

/*--------------------------------------------*
 * Session cookies
 *--------------------------------------------*/

export type Cookie = {
  id: string;
  token: string;
  loginName: string;
  displayName: string;
  userId: string; // Zitadel user ID for authorization checks
  organization?: string;
  creationTs: string;
  expirationTs: string;
  changeTs: string;
  requestId?: string; // if its linked to an OIDC flow
  selectedSession?: boolean;
};

type SessionCookie<T> = Cookie & T;

async function setSessionHttpOnlyCookie<T>(sessions: SessionCookie<T>[]): Promise<void> {
  const cookiesList = await cookies();

  cookiesList.set({
    name: "sessions",
    value: JSON.stringify(sessions.map((session) => signSession(session))),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/**
 * Parses the sessions cookie and drops every entry without a valid signature, so a client
 * cannot inject or patch an entry
 */
function readSessionCookies<T>(value: string | undefined): SessionCookie<T>[] {
  const sessions = parseAndVerifySessions<SessionCookie<T>>(value);

  if (value) {
    const total = countCookieEntries(value);
    if (sessions.length < total) {
      logMessage.warn(
        `readSessionCookies: ignoring ${total - sessions.length} session cookie entries with a missing or invalid signature`
      );
    }
  }

  return sessions;
}

function countCookieEntries(value: string): number {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export async function addSessionToCookie<T>({
  session,
  cleanup,
}: {
  session: SessionCookie<T>;
  cleanup?: boolean;
}): Promise<void> {
  const cookiesList = await cookies();
  const stringifiedCookie = cookiesList.get("sessions");

  let currentSessions: SessionCookie<T>[] = readSessionCookies<T>(stringifiedCookie?.value);

  // Set all current sessions to non-active session
  currentSessions.forEach((session) => {
    session.selectedSession = false;
  });
  // Set current session as active
  session.selectedSession = true;

  const index = currentSessions.findIndex((s) => s.loginName === session.loginName);

  if (index > -1) {
    currentSessions[index] = session;
  } else {
    const temp = [...currentSessions, session];

    if (JSON.stringify(temp.map((s) => signSession(s))).length >= MAX_COOKIE_SIZE) {
      logMessage.warn("WARNING COOKIE OVERFLOW");
      // TODO: improve cookie handling
      // this replaces the first session (oldest) with the new one
      currentSessions = [session].concat(currentSessions.slice(1));
    } else {
      currentSessions = [session].concat(currentSessions);
    }
  }

  if (cleanup) {
    const now = new Date();
    const filteredSessions = currentSessions.filter((session) =>
      session.expirationTs
        ? timestampDate(timestampFromMs(Number(session.expirationTs))) > now
        : true
    );
    await setSessionHttpOnlyCookie(filteredSessions);
  } else {
    await setSessionHttpOnlyCookie(currentSessions);
  }
}

export async function updateSessionCookie<T>({
  id,
  session,
  cleanup,
}: {
  id: string;
  session: SessionCookie<T>;
  cleanup?: boolean;
}): Promise<void> {
  const cookiesList = await cookies();
  const stringifiedCookie = cookiesList.get("sessions");

  const sessions: SessionCookie<T>[] = stringifiedCookie?.value
    ? readSessionCookies<T>(stringifiedCookie.value)
    : [session];

  // Set all current sessions to non-active session
  sessions.forEach((session) => {
    session.selectedSession = false;
  });
  // Set current session as active
  session.selectedSession = true;

  const foundIndex = sessions.findIndex((session) => session.id === id);

  if (foundIndex > -1) {
    sessions[foundIndex] = session;
    if (cleanup) {
      const now = new Date();
      const filteredSessions = sessions.filter((session) =>
        session.expirationTs
          ? timestampDate(timestampFromMs(Number(session.expirationTs))) > now
          : true
      );
      await setSessionHttpOnlyCookie(filteredSessions);
    } else {
      await setSessionHttpOnlyCookie(sessions);
    }
  } else {
    throw "updateSessionCookie<T>: session id now found";
  }
}

export async function removeSessionFromCookie<T>({
  sessionId,
  cleanup,
}: {
  sessionId: string;
  cleanup?: boolean;
  iFrameEnabled?: boolean;
}) {
  const cookiesList = await cookies();
  const stringifiedCookie = cookiesList.get("sessions");

  const sessions = readSessionCookies<T>(stringifiedCookie?.value);

  if (sessions.length < 1) {
    // No sessions in cookie
    return;
  }

  const reducedSessions = sessions.filter((s) => s.id !== sessionId);
  if (cleanup) {
    const now = new Date();
    const filteredSessions = reducedSessions.filter((session) =>
      session.expirationTs
        ? timestampDate(timestampFromMs(Number(session.expirationTs))) > now
        : true
    );
    await setSessionHttpOnlyCookie(filteredSessions);
  } else {
    await setSessionHttpOnlyCookie(reducedSessions);
  }
}

export async function getActiveSessionCookie() {
  const cookiesList = await cookies();
  const stringifiedCookie = cookiesList.get("sessions");

  const sessions: Cookie[] = readSessionCookies(stringifiedCookie?.value);

  const activeSession = sessions.find((session) => session.selectedSession);
  if (activeSession) {
    return activeSession;
  }

  throw new Error("No active Session cookie found");
}

export async function getSessionCookieById<T>({
  sessionId,
}: {
  sessionId: string;
}): Promise<SessionCookie<T>> {
  const cookiesList = await cookies();
  const stringifiedCookie = cookiesList.get("sessions");

  const sessions = readSessionCookies<T>(stringifiedCookie?.value);

  const found = sessions.find((s) => s.organization === ZITADEL_ORGANIZATION && s.id === sessionId);
  if (found) {
    return found;
  }
  return Promise.reject();
}

/**
 *
 * @param cleanup when true, removes all expired sessions, default true
 * @returns Session Cookies
 */
export async function getAllSessions<T>(cleanup: boolean = false): Promise<SessionCookie<T>[]> {
  const cookiesList = await cookies();
  const stringifiedCookie = cookiesList.get("sessions");

  const sessions = readSessionCookies<T>(stringifiedCookie?.value);

  if (!sessions.length) {
    logMessage.info("getAllSessions: No session cookie found, returning empty array");
    return [];
  }

  if (cleanup) {
    const now = new Date();
    return sessions.filter((session) =>
      session.expirationTs
        ? timestampDate(timestampFromMs(Number(session.expirationTs))) > now
        : true
    );
  }
  return sessions;
}

export async function setSelectedSession(sessionId: string) {
  const cookiesList = await cookies();
  const stringifiedCookie = cookiesList.get("sessions");

  const sessions: Cookie[] = readSessionCookies(stringifiedCookie?.value);

  await setSessionHttpOnlyCookie(
    sessions.map((session) => ({
      ...session,
      selectedSession: session.id === sessionId,
    }))
  );
}

/*--------------------------------------------*
 * Session cookie signing
 *--------------------------------------------*/

const signingKeyCache = new Map<string, Buffer>();

function getSigningKey(secret: string, info: string): Buffer {
  const cacheKey = JSON.stringify([info, secret]);
  let key = signingKeyCache.get(cacheKey);
  if (!key) {
    key = Buffer.from(hkdfSync("sha256", secret, "", info, DERIVED_KEY_LENGTH));
    signingKeyCache.set(cacheKey, key);
  }
  return key;
}

function getSigningSecrets(): string[] {
  return (process.env.ZITADEL_SESSION_COOKIE_SECRET ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Returns all secrets that may be used to sign / verify session cookie entries, in priority order.
 *
 * ZITADEL_SESSION_COOKIE_SECRET is required. A comma-separated list is supported so a secret can be
 * rotated without invalidating existing cookies: the first entry is used for signing, all entries are
 * accepted for verification. Every entry must be at least MIN_SESSION_COOKIE_SECRET_LENGTH characters
 * long; if the variable is unset or any entry is shorter, no secret is returned at all (signing fails
 * and /healthy reports unavailable).
 */
export function getSessionCookieSecrets(): string[] {
  const secrets = getSigningSecrets();

  for (const secret of secrets) {
    if (secret.length < MIN_SESSION_COOKIE_SECRET_LENGTH) {
      logMessage.error(
        `ZITADEL_SESSION_COOKIE_SECRET is invalid: every value must be at least ${MIN_SESSION_COOKIE_SECRET_LENGTH} characters long`
      );
      return [];
    }
  }

  return Array.from(new Set(secrets));
}

/**
 * Canonical representation of a cookie entry for signing. All fields (except `sig`) are covered,
 * so no part of an entry can be tampered with. Keys are sorted and undefined values are dropped to
 * make the payload independent of key order and of the JSON round-trip through the cookie.
 */
function canonicalPayload(session: SignableSession): string {
  const { sig: _ignored, ...fields } = session;
  const sorted = Object.fromEntries(
    Object.keys(fields)
      .sort()
      .filter((key) => (fields as Record<string, unknown>)[key] !== undefined)
      .map((key) => [key, (fields as Record<string, unknown>)[key]])
  );
  return JSON.stringify([SIGNATURE_VERSION, sorted]);
}

function computeSignature(session: SignableSession, secret: string): string {
  return createHmac("sha256", getSigningKey(secret, HKDF_INFO))
    .update(canonicalPayload(session))
    .digest("base64url");
}

function getPrimarySigningSecret(): string {
  const [secret] = getSessionCookieSecrets();
  if (!secret) {
    throw new Error(
      `Session cookie signing secret is not configured. Set ZITADEL_SESSION_COOKIE_SECRET (at least ${MIN_SESSION_COOKIE_SECRET_LENGTH} characters).`
    );
  }
  return secret;
}

function signaturesEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  if (leftBytes.length !== rightBytes.length) {
    return false;
  }
  return timingSafeEqual(leftBytes, rightBytes);
}

export function signSession<T extends SignableSession>(session: T): T & { sig: string } {
  if (!session.id || !session.token) {
    throw new Error("Session cookie entries require a non-empty id and token to be signed.");
  }

  const secret = getPrimarySigningSecret();

  const { sig: _ignored, ...unsigned } = session;
  return {
    ...(unsigned as T),
    sig: computeSignature(unsigned, secret),
  };
}

export function verifySession(session: unknown): session is SignableSession & { sig: string } {
  if (!session || typeof session !== "object") {
    return false;
  }

  const candidate = session as SignableSession;
  if (
    typeof candidate.id !== "string" ||
    !candidate.id ||
    typeof candidate.token !== "string" ||
    !candidate.token ||
    typeof candidate.sig !== "string" ||
    !candidate.sig
  ) {
    return false;
  }

  const { sig, ...unsigned } = candidate;
  // Check every candidate secret (no early return) to keep timing independent of which one matches
  let valid = false;
  for (const secret of getSessionCookieSecrets()) {
    if (signaturesEqual(sig, computeSignature(unsigned, secret))) {
      valid = true;
    }
  }
  return valid;
}

export function stripSessionSignature<T extends SignableSession>(session: T): Omit<T, "sig"> {
  const { sig: _ignored, ...unsigned } = session;
  return unsigned;
}

export function parseAndVerifySessions<T extends SignableSession>(value: string | undefined): T[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(verifySession).map((session) => stripSessionSignature(session as T) as T);
  } catch {
    return [];
  }
}
