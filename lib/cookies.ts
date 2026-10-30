/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { cookies } from "next/headers";
import { timestampDate, timestampFromMs } from "@zitadel/client";

import { ZITADEL_ORGANIZATION } from "@root/constants/config";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { logMessage } from "./logger";
import { createSigner } from "./signing";

import "server-only";

// TODO: improve this to handle overflow
const MAX_COOKIE_SIZE = 3500;
const sessionCookieSigner = createSigner("ZITADEL_SESSION_COOKIE_SECRET", "session-cookie", 32);

type SignedSessions<T> = {
  sessions: T[];
  sig: string;
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

function signSessions<T>(sessions: T[]): SignedSessions<T> {
  return {
    sessions,
    sig: sessionCookieSigner.sign(sessions),
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

  return sessionCookieSigner.verify(value.sessions, value.sig);
}
