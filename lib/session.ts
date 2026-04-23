/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { Timestamp, timestampDate } from "@zitadel/client";
import { AuthRequest } from "@zitadel/proto/zitadel/oidc/v2/authorization_pb";
import { Session } from "@zitadel/proto/zitadel/session/v2/session_pb";
import { GetSessionResponse } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { AuthenticationMethodType } from "@zitadel/proto/zitadel/user/v2/user_service_pb";

/*--------------------------------------------*
 * Parent Relative
 *--------------------------------------------*/
import { getSession, getUserByID, listAuthenticationMethodTypes } from "../lib/zitadel";

/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { getMostRecentCookieWithLoginname, getSessionCookieById } from "./cookies";
import { logMessage } from "./logger";
export function checkSessionFactorValidity(session: Partial<Session>): {
  valid: boolean;
  verifiedAt?: Timestamp;
} {
  const validPassword = session?.factors?.password?.verifiedAt;
  const validPasskey = session?.factors?.webAuthN?.verifiedAt;
  const validIDP = session?.factors?.intent?.verifiedAt;
  const stillValid = session.expirationDate
    ? timestampDate(session.expirationDate) > new Date()
    : true;

  const verifiedAt = validPassword || validPasskey || validIDP;
  const valid = !!((validPassword || validPasskey || validIDP) && stillValid);

  return { valid, verifiedAt };
}

type LoadMostRecentSessionParams = {
  serviceUrl: string;
  sessionParams: {
    loginName?: string;
    organization?: string;
  };
};

export async function loadMostRecentSession({
  serviceUrl,
  sessionParams,
}: LoadMostRecentSessionParams): Promise<Session | undefined> {
  const recent = await getMostRecentCookieWithLoginname({
    loginName: sessionParams.loginName,
    organization: sessionParams.organization,
  });

  return getSession({
    serviceUrl,
    sessionId: recent.id,
    sessionToken: recent.token,
  }).then((resp: GetSessionResponse) => resp.session);
}

export type SessionWithAuthData = {
  id?: string;
  factors?: Session["factors"];
  authMethods: AuthenticationMethodType[];
  phoneVerified: boolean;
  emailVerified: boolean;
  expirationDate?: Session["expirationDate"];
};

async function getAuthMethodsAndUser(
  serviceUrl: string,
  session?: Session
): Promise<SessionWithAuthData> {
  const userId = session?.factors?.user?.id;

  if (!userId) {
    throw Error("Could not get user id from session");
  }

  const methods = await listAuthenticationMethodTypes({
    serviceUrl,
    userId,
  });

  const user = await getUserByID({ serviceUrl, userId });
  const humanUser = user.user?.type.case === "human" ? user.user?.type.value : undefined;

  return {
    id: session?.id,
    factors: session?.factors,
    authMethods: methods.authMethodTypes ?? [],
    phoneVerified: humanUser?.phone?.isVerified ?? false,
    emailVerified: humanUser?.email?.isVerified ?? false,
    expirationDate: session?.expirationDate,
  };
}

export async function loadSessionById(
  serviceUrl: string,
  sessionId: string,
  organization?: string
): Promise<SessionWithAuthData> {
  const recent = await getSessionCookieById({ sessionId, organization });
  const sessionResponse = await getSession({
    serviceUrl,
    sessionId: recent.id,
    sessionToken: recent.token,
  });
  return getAuthMethodsAndUser(serviceUrl, sessionResponse.session);
}

export async function loadSessionByLoginname(
  serviceUrl: string,
  loginName?: string,
  organization?: string
): Promise<SessionWithAuthData> {
  const session = await loadMostRecentSession({
    serviceUrl,
    sessionParams: {
      loginName,
      organization,
    },
  });
  return getAuthMethodsAndUser(serviceUrl, session);
}

/**
 * Load session factors (authentication state) by session ID without fetching auth methods or user verification data.
 * Use this when you only need the session's authentication factors, not the complete enriched session data.
 */
export async function loadSessionFactorsById(
  serviceUrl: string,
  sessionId: string,
  organization?: string
): Promise<Session | undefined> {
  const recent = await getSessionCookieById({ sessionId, organization });
  return getSession({
    serviceUrl,
    sessionId: recent.id,
    sessionToken: recent.token,
  }).then((response) => {
    if (response?.session) {
      return response.session;
    }
  });
}

/**
 * mfa is required, session is not valid anymore (e.g. session expired, user logged out, etc.)
 * to check for mfa for automatically selected session -> const response = await listAuthenticationMethodTypes(userId);
 **/
export async function isSessionValid({
  serviceUrl,
  session,
}: {
  serviceUrl: string;
  session: Session;
}): Promise<boolean> {
  // session can't be checked without user
  if (!session.factors?.user) {
    logMessage.info("Session has no user");
    return false;
  }

  // Check session expiration first
  const stillValid = session.expirationDate
    ? timestampDate(session.expirationDate).getTime() > new Date().getTime()
    : true;

  if (!stillValid) {
    const expirationInfo = session.expirationDate
      ? timestampDate(session.expirationDate).toDateString()
      : "no expiration date";
    logMessage.info(`Session is expired: ${expirationInfo}`);
    return false;
  }

  // Password must be verified for a valid session
  const validPassword = !!session?.factors?.password?.verifiedAt;

  if (!validPassword) {
    logMessage.info("Session has no valid password verification");
    return false;
  }

  // At least one MFA (TOTP or U2F) must be verified
  const totpValid = !!session.factors.totp?.verifiedAt;
  const u2fValid = !!session.factors.webAuthN?.verifiedAt;
  const optEmail = !!session.factors.otpEmail?.verifiedAt;
  const mfaValid = totpValid || u2fValid || optEmail;

  if (!mfaValid) {
    logMessage.debug("Session has no valid MFA factor (TOTP, U2F required)");
    return false;
  }

  try {
    const userResponse = await getUserByID({
      serviceUrl,
      userId: session.factors.user.id,
    });

    const humanUser =
      userResponse?.user?.type.case === "human" ? userResponse?.user.type.value : undefined;

    if (humanUser && !humanUser.email?.isVerified) {
      logMessage.info(`Session invalid: Email not verified for user: ${session.factors.user.id}`);
      return false;
    }
  } catch (error) {
    logMessage.info(
      `Session invalid: Could not load user ${session.factors.user.id} while validating email verification`
    );
    return false;
  }

  return true;
}

export async function findValidSession({
  serviceUrl,
  sessions,
  authRequest,
}: {
  serviceUrl: string;
  sessions: Session[];
  authRequest?: AuthRequest;
}): Promise<Session | undefined> {
  const sessionsWithHint = sessions.filter((s) => {
    if (authRequest && authRequest.hintUserId) {
      return s.factors?.user?.id === authRequest.hintUserId;
    }
    if (authRequest && authRequest.loginHint) {
      return s.factors?.user?.loginName === authRequest.loginHint;
    }
    return true;
  });

  if (sessionsWithHint.length === 0) {
    return undefined;
  }

  // sort by change date descending
  sessionsWithHint.sort((a, b) => {
    const dateA = a.changeDate ? timestampDate(a.changeDate).getTime() : 0;
    const dateB = b.changeDate ? timestampDate(b.changeDate).getTime() : 0;
    return dateB - dateA;
  });

  // return the first valid session according to settings
  for (const session of sessionsWithHint) {
    // eslint-disable-next-line no-await-in-loop
    if (await isSessionValid({ serviceUrl, session })) {
      return session;
    }
  }

  return undefined;
}
