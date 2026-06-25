"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { Challenges, RequestChallenges } from "@zitadel/proto/zitadel/session/v2/challenge_pb";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { Checks } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

import { logMessage } from "@lib/logger";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { completeFlowAndRedirect } from "@lib/server/auth-flow";
import { setSessionAndUpdateCookie } from "@lib/server/cookie";
import {
  deleteSession,
  getLoginSettings,
  getSecuritySettings,
  listAuthenticationMethodTypes,
  listSessions,
} from "@lib/zitadel";
import { serverTranslation } from "@i18n/server";

import {
  Cookie,
  getActiveSessionCookie,
  getAllSessions,
  getSessionCookieById,
  removeSessionFromCookie,
} from "../cookies";

import { getOriginalHost } from "./host";

/**
 * Load sessions by their IDs
 * @param ids - Array of session IDs to load
 * @returns Array of Session objects
 */
async function loadSessionsByIds({ ids }: { ids: string[] }): Promise<Session[]> {
  const response = await listSessions({
    ids: ids.filter((id: string | undefined) => !!id),
  });

  return response?.sessions ?? [];
}

/**
 * Load sessions with their corresponding cookies
 * Useful when you need both Session objects and cookie tokens (e.g., for OIDC callbacks)
 * @param cleanup - Whether to filter out expired sessions (default: true)
 * @returns Object containing both sessions and sessionCookies arrays
 */
export async function loadSessionsWithCookies({
  cleanup = true,
}: {
  cleanup?: boolean;
} = {}): Promise<{ sessions: Session[]; sessionCookies: Cookie[] }> {
  const sessionCookies = await getAllSessions(cleanup);

  if (!sessionCookies.length) {
    return { sessions: [], sessionCookies: [] };
  }

  const ids = sessionCookies.map((s) => s.id).filter((id) => !!id);
  const sessions = await loadSessionsByIds({ ids });

  return { sessions, sessionCookies };
}

type ContinueWithSessionCommand = Session & { requestId?: string; redirect?: string | null };

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

export async function continueWithSession({
  requestId,
  redirect,
  ...session
}: ContinueWithSessionCommand) {
  const { t } = await serverTranslation("error");

  const loginSettings = await getLoginSettings();

  // Use provided redirect if available, otherwise use defaultRedirectUri
  const targetRedirect = redirect || loginSettings?.defaultRedirectUri;

  if (requestId && session.id && session.factors?.user) {
    return completeFlowAndRedirect(
      {
        sessionId: session.id,
        requestId: requestId,
      },
      targetRedirect
    );
  } else if (session.factors?.user) {
    // Always include sessionId to ensure we load the exact session that was just updated
    return completeFlowAndRedirect(
      {
        sessionId: session.id,
      },
      targetRedirect
    );
  }

  // Fallback error if we couldn't determine where to redirect
  return { error: t("couldNotContinueSession") };
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

    throw new Error("Could not update Session");
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
