"use server";

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
// TODO: improve this to handle overflow
const MAX_COOKIE_SIZE = 2048;

export type Cookie = {
  id: string;
  token: string;
  loginName: string;
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
    value: JSON.stringify(sessions),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
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

  let currentSessions: SessionCookie<T>[] = stringifiedCookie?.value
    ? JSON.parse(stringifiedCookie?.value)
    : [];

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

    if (JSON.stringify(temp).length >= MAX_COOKIE_SIZE) {
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
    ? JSON.parse(stringifiedCookie?.value)
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
  session,
  cleanup,
}: {
  session: SessionCookie<T>;
  cleanup?: boolean;
  iFrameEnabled?: boolean;
}) {
  const cookiesList = await cookies();
  const stringifiedCookie = cookiesList.get("sessions");

  const sessions: SessionCookie<T>[] = stringifiedCookie?.value
    ? JSON.parse(stringifiedCookie?.value)
    : [session];

  const reducedSessions = sessions.filter((s) => s.id !== session.id);
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

  if (stringifiedCookie?.value) {
    const sessions: Cookie[] = JSON.parse(stringifiedCookie?.value);

    const activeSession = sessions.filter((session) => session.selectedSession);
    if (activeSession.length) {
      const sessionCookie = activeSession[0];
      return sessionCookie;
    }
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

  if (stringifiedCookie?.value) {
    const sessions: SessionCookie<T>[] = JSON.parse(stringifiedCookie?.value);

    const found = sessions.find(
      (s) => s.organization === ZITADEL_ORGANIZATION && s.id === sessionId
    );
    if (found) {
      return found;
    } else {
      return Promise.reject();
    }
  } else {
    return Promise.reject();
  }
}

export async function getSessionCookieByLoginName<T>({
  loginName,
}: {
  loginName?: string;
}): Promise<SessionCookie<T>> {
  const cookiesList = await cookies();
  const stringifiedCookie = cookiesList.get("sessions");

  if (stringifiedCookie?.value) {
    const sessions: SessionCookie<T>[] = JSON.parse(stringifiedCookie?.value);
    const found = sessions.find(
      (s) => s.organization === ZITADEL_ORGANIZATION && s.loginName === loginName
    );
    if (found) {
      return found;
    } else {
      return Promise.reject("no cookie found with loginName: " + loginName);
    }
  } else {
    return Promise.reject("no session cookie found");
  }
}

/**
 *
 * @param cleanup when true, removes all expired sessions, default true
 * @returns Session Cookies
 */
export async function getAllSessionCookieIds<T>(cleanup: boolean = false): Promise<string[]> {
  const cookiesList = await cookies();
  const stringifiedCookie = cookiesList.get("sessions");

  if (stringifiedCookie?.value) {
    const sessions: SessionCookie<T>[] = JSON.parse(stringifiedCookie?.value);

    if (cleanup) {
      const now = new Date();
      return sessions
        .filter((session) =>
          session.expirationTs
            ? timestampDate(timestampFromMs(Number(session.expirationTs))) > now
            : true
        )
        .map((session) => session.id);
    } else {
      return sessions.map((session) => session.id);
    }
  } else {
    return [];
  }
}

/**
 *
 * @param cleanup when true, removes all expired sessions, default true
 * @returns Session Cookies
 */
export async function getAllSessions<T>(cleanup: boolean = false): Promise<SessionCookie<T>[]> {
  const cookiesList = await cookies();
  const stringifiedCookie = cookiesList.get("sessions");

  if (stringifiedCookie?.value) {
    const sessions: SessionCookie<T>[] = JSON.parse(stringifiedCookie?.value);

    if (cleanup) {
      const now = new Date();
      return sessions.filter((session) =>
        session.expirationTs
          ? timestampDate(timestampFromMs(Number(session.expirationTs))) > now
          : true
      );
    } else {
      return sessions;
    }
  } else {
    logMessage.info("getAllSessions: No session cookie found, returning empty array");
    return [];
  }
}

/**
 * Returns most recent session filtered by optinal loginName
 * @param loginName optional loginName to filter cookies, if non provided, returns most recent session
 * @param organization optional organization to filter cookies
 * @returns most recent session
 */
export async function getMostRecentCookie<T>(): Promise<SessionCookie<T>> {
  const cookiesList = await cookies();
  const stringifiedCookie = cookiesList.get("sessions");

  if (stringifiedCookie?.value) {
    const sessions: SessionCookie<T>[] = JSON.parse(stringifiedCookie?.value);
    let filtered = sessions;

    filtered = filtered.filter((cookie) => {
      return cookie.organization === ZITADEL_ORGANIZATION;
    });

    const latest =
      filtered && filtered.length
        ? filtered.reduce((prev, current) => {
            return prev.changeTs > current.changeTs ? prev : current;
          })
        : undefined;

    if (latest) {
      return latest;
    } else {
      return Promise.reject("Could not get the context or retrieve a session");
    }
  } else {
    return Promise.reject("Could not read session cookie");
  }
}

/**
 * Get session credentials from the http-only session cookie
 * @returns sessionId, loginName, organization, and requestId (if linked to OIDC flow)
 */
// TODO - Refactor to see if we still need this transformative function
export async function getSessionCredentials() {
  try {
    const { id, loginName, userId, organization, requestId } = await getActiveSessionCookie();

    return {
      sessionId: id,
      loginName,
      userId,
      organization,
      requestId, // Include requestId for OIDC flows
    };
  } catch (error) {
    throw new Error("No session found in cookies");
  }
}

export async function setSelectedSession(sessionId: string) {
  const cookiesList = await cookies();
  const stringifiedCookie = cookiesList.get("sessions");

  const sessions: Cookie[] = stringifiedCookie?.value ? JSON.parse(stringifiedCookie?.value) : [];

  await setSessionHttpOnlyCookie(
    sessions.map((session) => ({
      ...session,
      selectedSession: session.id === sessionId,
    }))
  );
}
