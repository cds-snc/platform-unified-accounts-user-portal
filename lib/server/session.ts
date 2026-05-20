"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { Duration } from "@zitadel/client";
import { RequestChallenges } from "@zitadel/proto/zitadel/session/v2/challenge_pb";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { Checks } from "@zitadel/proto/zitadel/session/v2/session_service_pb";

/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { completeFlowOrGetUrl } from "@lib/client";
import { logMessage } from "@lib/logger";
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
  getAllSessionCookieIds,
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
 * Load sessions for all cookie IDs
 * @param cleanup - Whether to filter out expired sessions (default: true)
 * @returns Array of Session objects
 */
export async function loadSessionsFromCookies({
  cleanup = true,
}: {
  cleanup?: boolean;
} = {}): Promise<Session[]> {
  const cookieIds = await getAllSessionCookieIds(cleanup);

  if (cookieIds && cookieIds.length) {
    return loadSessionsByIds({
      ids: cookieIds.filter((id) => !!id) as string[],
    });
  }

  return [];
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
    return completeFlowOrGetUrl(
      {
        sessionId: session.id,
        requestId: requestId,
      },
      targetRedirect
    );
  } else if (session.factors?.user) {
    // Always include sessionId to ensure we load the exact session that was just updated
    return completeFlowOrGetUrl(
      {
        sessionId: session.id,
        loginName: session.factors.user.loginName,
      },
      targetRedirect
    );
  }

  // Fallback error if we couldn't determine where to redirect
  return { error: t("couldNotContinueSession") };
}

type UpdateSessionCommand = {
  loginName?: string;
  sessionId?: string;
  checks?: Checks;
  requestId?: string;
  challenges?: RequestChallenges;
  lifetime?: Duration;
};

export async function updateSession(options: UpdateSessionCommand) {
  const { sessionId, checks, requestId, challenges } = options;
  try {
    const activeSession = sessionId
      ? await getSessionCookieById({ sessionId })
      : await getActiveSessionCookie();

    if (!activeSession) {
      return {
        error: "Could not find session",
      };
    }

    const host = await getOriginalHost();

    if (!host) {
      return { error: "Could not get host" };
    }

    if (host && challenges && challenges.webAuthN && !challenges.webAuthN.domain) {
      const [hostname] = host.split(":");

      challenges.webAuthN.domain = hostname;
    }

    const loginSettings = await getLoginSettings();

    let lifetime = checks?.webAuthN
      ? loginSettings?.multiFactorCheckLifetime // TODO different lifetime for webauthn u2f/passkey
      : checks?.otpEmail || checks?.otpSms
        ? loginSettings?.secondFactorCheckLifetime
        : undefined;

    if (!lifetime || !lifetime.seconds) {
      lifetime = {
        seconds: BigInt(60 * 60 * 24), // default to 24 hours
        nanos: 0,
      } as Duration;
    }

    let session;

    try {
      session = await setSessionAndUpdateCookie({
        activeCookie: activeSession,
        checks,
        challenges,
        requestId,
        lifetime,
      });
    } catch (error) {
      const serializedError = serializeActionError(error, "Could not update session");

      logMessage.debug({
        message: "Failed to update session with checks/challenges",
        error: serializedError,
        hasChecks: !!checks,
        hasChallenges: !!challenges,
      });

      return {
        error: serializedError,
      };
    }

    if (!session) {
      return { error: "Could not update session" };
    }

    // if password, check if user has MFA methods
    let authMethods;
    if (checks && checks.password && session.factors?.user?.id) {
      const response = await listAuthenticationMethodTypes(session.factors.user.id);
      if (response.authMethodTypes && response.authMethodTypes.length) {
        authMethods = response.authMethodTypes;
      }
    }

    return {
      sessionId: session.id,
      factors: session.factors,
      challenges: session.challenges,
      authMethods,
    };
  } catch (error) {
    const serializedError = serializeActionError(error, "Could not update session");

    logMessage.debug({
      message: "Unexpected failure while updating session",
      error: serializedError,
      hasChecks: !!checks,
      hasChallenges: !!challenges,
    });

    return {
      error: serializedError,
    };
  }
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

  return removeSessionFromCookie({ session: sessionCookie, iFrameEnabled });
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
