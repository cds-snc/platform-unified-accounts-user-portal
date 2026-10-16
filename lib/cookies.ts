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
const MIN_SESSION_COOKIE_SECRET_LENGTH = 32;

type SignedSessions<T> = {
  sessions: T[];
  sig: string;
};

/*--------------------------------------------*
 * Session cookies
 *--------------------------------------------*/

export const PASSWORD_RESET_COOKIE = "passwordReset";
export const PASSWORD_RESET_TTL_SECONDS = 15 * 60;

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

export async function setPasswordResetCookie(key: string): Promise<void> {
  (await cookies()).set({
    name: PASSWORD_RESET_COOKIE,
    value: key,
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: PASSWORD_RESET_TTL_SECONDS,
  });
}

export async function getPasswordResetCookie(): Promise<string | undefined> {
  const cookie = (await cookies()).get(PASSWORD_RESET_COOKIE);
  return cookie?.value;
}

export async function deletePasswordResetCookie(): Promise<void> {
  (await cookies()).delete(PASSWORD_RESET_COOKIE);
}

async function setSessionHttpOnlyCookie<T>(sessions: SessionCookie<T>[]): Promise<void> {
  const cookiesList = await cookies();

  cookiesList.set({
    name: "sessions",
    value: JSON.stringify(signSessions(sessions)),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function readSessionCookies<T>(value: string | undefined): SessionCookie<T>[] {
  if (!value) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    logMessage.warn("readSessionCookies: ignoring malformed sessions cookie");
    return [];
  }

  if (!verifySessions(parsed)) {
    logMessage.warn(
      "readSessionCookies: ignoring sessions cookie with a missing or invalid signature"
    );
    return [];
  }

  return parsed.sessions as SessionCookie<T>[];
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

    if (JSON.stringify(signSessions(temp)).length >= MAX_COOKIE_SIZE) {
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
 * Returns all secrets that may be used to sign / verify the sessions cookie, in priority order.
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

function computeSignature(sessions: unknown[], secret: string): string {
  return createHmac("sha256", getSigningKey(secret, HKDF_INFO))
    .update(JSON.stringify([SIGNATURE_VERSION, sessions]))
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

function signSessions<T>(sessions: T[]): SignedSessions<T> {
  const secret = getPrimarySigningSecret();

  return {
    sessions,
    sig: computeSignature(sessions, secret),
  };
}

function verifySessions(value: unknown): value is SignedSessions<unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }

  if (
    !("sessions" in value) ||
    !Array.isArray(value.sessions) ||
    !("sig" in value) ||
    typeof value.sig !== "string" ||
    !value.sig
  ) {
    return false;
  }

  const { sig, sessions } = value;
  // Check every candidate secret (no early return) to keep timing independent of which one matches
  let valid = false;
  for (const secret of getSessionCookieSecrets()) {
    if (signaturesEqual(sig, computeSignature(sessions, secret))) {
      valid = true;
    }
  }
  return valid;
}
