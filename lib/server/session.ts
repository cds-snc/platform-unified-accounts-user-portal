/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Challenges, RequestChallenges } from "@zitadel/proto/zitadel/session/v2/challenge_pb";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { Checks, GetSessionResponse } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

import { logMessage } from "@lib/logger";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { setSessionAndUpdateCookie } from "@lib/server/cookie";
import { SessionWithAuthData } from "@lib/session";
import {
  deleteSession,
  getSecuritySettings,
  getSession,
  getUserByID,
  listAuthenticationMethodTypes,
} from "@lib/zitadel";

import {
  Cookie,
  getActiveSessionCookie,
  getAllSessions,
  getSessionCookieById,
  removeSessionFromCookie,
} from "../cookies";

import { getOriginalHost } from "./host";

import "server-only";

/**
 * Load sessions with their corresponding cookies
 * Useful when you need both Session objects and cookie tokens (e.g., for OIDC callbacks)
 * @param cleanup - Whether to filter out expired sessions (default: true)
 * @returns Object containing both sessions and sessionCookies arrays
 */
export async function getSessionWithCookie({
  sessionId,
  cleanup = true,
}: {
  sessionId: string;
  cleanup?: boolean;
}): Promise<{ session?: SessionWithAuthData; cookie?: Cookie }> {
  const sessionCookie = (await getAllSessions(cleanup)).find((cookie) => cookie.id === sessionId);

  if (!sessionCookie) {
    return { session: undefined, cookie: undefined };
  }

  const sessionResponse = await getSession(sessionId, sessionCookie.token)
    .then(async ({ session }: GetSessionResponse) => {
      if (!session?.factors?.user) {
        throw Error("No User found on session");
      }

      const methods = await listAuthenticationMethodTypes(session.factors.user.id);

      const user = await getUserByID(session.factors.user.id);
      const humanUser = user.user?.type.case === "human" ? user.user?.type.value : undefined;

      return {
        ...session,
        authMethods: methods.authMethodTypes ?? [],
        phoneVerified: humanUser?.phone?.isVerified ?? false,
        emailVerified: humanUser?.email?.isVerified ?? false,
      } as SessionWithAuthData;
    })
    .catch(async () => {
      // Unhandled error, possibly locked account
      // Remove session from cookie and redirect to start a new session
      await removeSessionFromCookie({ sessionId });
      return undefined;
    });

  if (!sessionResponse) {
    return { session: undefined, cookie: undefined };
  }

  return { session: sessionResponse, cookie: sessionCookie };
}

type SerializedActionError = {
  message: string;
  rawMessage?: string;
  code?: number;
};

function serializeActionError(
  error: unknown,
  fallbackMessage: string = "Could not update session"
): SerializedActionError {
  if (!error || typeof error !== "object") {
    return { message: fallbackMessage };
  }

  const serializedError: SerializedActionError = {
    message:
      "message" in error && typeof error.message === "string" ? error.message : fallbackMessage,
  };

  if ("rawMessage" in error && typeof error.rawMessage === "string") {
    serializedError.rawMessage = error.rawMessage;
  }

  if ("code" in error && typeof error.code === "number") {
    serializedError.code = error.code;
  }

  return serializedError;
}

type UpdateSessionCommand = {
  checks?: Checks;
  requestId?: string;
  challenges?: RequestChallenges;
};

export async function updateSession(options: UpdateSessionCommand): Promise<{
  sessionId: string;
  factors?: Session["factors"];
  challenges?: Challenges;
  authMethods?: AuthenticationMethodType[];
}> {
  const { checks, requestId, challenges } = options;

  const activeSession = await getActiveSessionCookie();

  const host = await getOriginalHost();

  if (typeof challenges?.webAuthN !== "undefined") {
    const [hostname] = host.split(":");

    challenges.webAuthN.domain = hostname;
  }

  const session = await setSessionAndUpdateCookie({
    activeCookie: activeSession,
    checks,
    challenges,
    requestId,
  }).catch((error) => {
    const serializedError = serializeActionError(error, "Could not update session");
    logMessage.error("Failed to update session with checks/challenges", serializedError);

    throw error;
  });

  // if password, check if user has MFA methods
  let authMethods;
  if (checks && checks.password && session.factors?.user?.id) {
    const response = await listAuthenticationMethodTypes(session.factors.user.id);
    if (response.authMethodTypes.length) {
      authMethods = response.authMethodTypes;
    }
  }

  return {
    sessionId: session.id,
    factors: session.factors,
    challenges: session.challenges,
    authMethods,
  };
}

type ClearSessionOptions = {
  sessionId: string;
};

async function clearSession(options: ClearSessionOptions) {
  const { sessionId } = options;

  const sessionCookie = await getSessionCookieById({ sessionId });

  const deleteResponse = await deleteSession({
    sessionId: sessionCookie.id,
    sessionToken: sessionCookie.token,
  });

  const securitySettings = await getSecuritySettings();
  const iFrameEnabled = !!securitySettings?.embeddedIframe?.enabled;

  if (!deleteResponse) {
    throw new Error("Could not delete session");
  }

  return removeSessionFromCookie({ sessionId: sessionCookie.id, iFrameEnabled });
}

type LogoutCurrentSessionOptions = {
  postLogoutRedirectUri?: string;
};

export async function logoutCurrentSession(
  options: LogoutCurrentSessionOptions = {}
): Promise<{ redirect: string } | { error: string }> {
  const { postLogoutRedirectUri } = options;

  try {
    const activeSession = await getActiveSessionCookie();

    if (!activeSession?.id) {
      return { error: "No active session found" };
    }

    await clearSession({ sessionId: activeSession.id });

    // Determine redirect URL
    if (postLogoutRedirectUri) {
      return { redirect: postLogoutRedirectUri };
    }

    const redirectUrl = `/`;
    return { redirect: redirectUrl };
  } catch (error) {
    logMessage.error("Error during logout", error);
    return { error: "Failed to logout" };
  }
}
