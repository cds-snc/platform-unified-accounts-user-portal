"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { headers } from "next/headers";
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

import { getServiceUrlFromHeaders } from "../../lib/service-url";
import {
  Cookie,
  getAllSessionCookieIds,
  getAllSessions,
  getMostRecentSessionCookie,
  getSessionCookieById,
  getSessionCookieByLoginName,
  removeSessionFromCookie,
} from "../cookies";

import { getOriginalHost } from "./host";

/**
 * Load sessions by their IDs
 * @param serviceUrl - The Zitadel service URL
 * @param ids - Array of session IDs to load
 * @returns Array of Session objects
 */
export async function loadSessionsByIds({
  serviceUrl,
  ids,
}: {
  serviceUrl: string;
  ids: string[];
}): Promise<Session[]> {
  const response = await listSessions({
    serviceUrl,
    ids: ids.filter((id: string | undefined) => !!id),
  });

  return response?.sessions ?? [];
}

/**
 * Load sessions for all cookie IDs
 * @param serviceUrl - The Zitadel service URL
 * @param cleanup - Whether to filter out expired sessions (default: true)
 * @returns Array of Session objects
 */
export async function loadSessionsFromCookies({
  serviceUrl,
  cleanup = true,
}: {
  serviceUrl: string;
  cleanup?: boolean;
}): Promise<Session[]> {
  const cookieIds = await getAllSessionCookieIds(cleanup);

  if (cookieIds && cookieIds.length) {
    return loadSessionsByIds({
      serviceUrl,
      ids: cookieIds.filter((id) => !!id) as string[],
    });
  }

  return [];
}

/**
 * Load sessions with their corresponding cookies
 * Useful when you need both Session objects and cookie tokens (e.g., for OIDC callbacks)
 * @param serviceUrl - The Zitadel service URL
 * @param cleanup - Whether to filter out expired sessions (default: true)
 * @returns Object containing both sessions and sessionCookies arrays
 */
export async function loadSessionsWithCookies({
  serviceUrl,
  cleanup = true,
}: {
  serviceUrl: string;
  cleanup?: boolean;
}): Promise<{ sessions: Session[]; sessionCookies: Cookie[] }> {
  const sessionCookies = await getAllSessions(cleanup);

  if (!sessionCookies.length) {
    return { sessions: [], sessionCookies: [] };
  }

  const ids = sessionCookies.map((s) => s.id).filter((id) => !!id);
  const sessions = await loadSessionsByIds({ serviceUrl, ids });

  return { sessions, sessionCookies };
}

export type ContinueWithSessionCommand = Session & { requestId?: string; redirect?: string | null };

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
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  const { t } = await serverTranslation("error");

  const loginSettings = await getLoginSettings({
    serviceUrl,
    organization: session.factors?.user?.organizationId,
  });

  // Use provided redirect if available, otherwise use defaultRedirectUri
  const targetRedirect = redirect || loginSettings?.defaultRedirectUri;

  if (requestId && session.id && session.factors?.user) {
    return completeFlowOrGetUrl(
      {
        sessionId: session.id,
        requestId: requestId,
        organization: session.factors.user.organizationId,
      },
      targetRedirect
    );
  } else if (session.factors?.user) {
    // Always include sessionId to ensure we load the exact session that was just updated
    return completeFlowOrGetUrl(
      {
        sessionId: session.id,
        loginName: session.factors.user.loginName,
        organization: session.factors.user.organizationId,
      },
      targetRedirect
    );
  }

  // Fallback error if we couldn't determine where to redirect
  return { error: t("couldNotContinueSession") };
}

export type UpdateSessionCommand = {
  loginName?: string;
  sessionId?: string;
  organization?: string;
  checks?: Checks;
  requestId?: string;
  challenges?: RequestChallenges;
  lifetime?: Duration;
};

export async function updateSession(options: UpdateSessionCommand) {
  const { loginName, sessionId, organization, checks, requestId, challenges } = options;
  try {
    const recentSession = sessionId
      ? await getSessionCookieById({ sessionId })
      : loginName
        ? await getSessionCookieByLoginName({ loginName, organization })
        : await getMostRecentSessionCookie();

    if (!recentSession) {
      return {
        error: "Could not find session",
      };
    }

    const _headers = await headers();
    const { serviceUrl } = getServiceUrlFromHeaders(_headers);
    const host = await getOriginalHost();

    if (!host) {
      return { error: "Could not get host" };
    }

    if (host && challenges && challenges.webAuthN && !challenges.webAuthN.domain) {
      const [hostname] = host.split(":");

      challenges.webAuthN.domain = hostname;
    }

    const loginSettings = await getLoginSettings({
      serviceUrl,
      organization,
    });

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
        recentCookie: recentSession,
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
      const response = await listAuthenticationMethodTypes({
        serviceUrl,
        userId: session.factors.user.id,
      });
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

export async function clearSession(options: ClearSessionOptions) {
  const _headers = await headers();
  const { serviceUrl } = getServiceUrlFromHeaders(_headers);

  const { sessionId } = options;

  const sessionCookie = await getSessionCookieById({ sessionId });

  const deleteResponse = await deleteSession({
    serviceUrl,
    sessionId: sessionCookie.id,
    sessionToken: sessionCookie.token,
  });

  const securitySettings = await getSecuritySettings({ serviceUrl });
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
    const mostRecentSession = await getMostRecentSessionCookie();

    if (!mostRecentSession?.id) {
      return { error: "No active session found" };
    }

    await clearSession({ sessionId: mostRecentSession.id });

    // Determine redirect URL
    if (postLogoutRedirectUri) {
      return { redirect: postLogoutRedirectUri };
    }

    const redirectUrl = `/`;
    return { redirect: redirectUrl };
  } catch (error) {
    logMessage.info("Error during logout");
    return { error: "Failed to logout" };
  }
}
