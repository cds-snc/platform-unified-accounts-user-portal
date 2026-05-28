/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import { redirect, RedirectType } from "next/navigation";
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
import { getActiveSessionCookie } from "./cookies";
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

export async function loadActiveSession(): Promise<SessionWithAuthData> {
  const active = await getActiveSessionCookie();
  // If there is no active user session throw so it can be caught and handled
  if (!active) {
    throw new Error("No active session found");
  }

  const session = await getSession(active.id, active.token).then(
    (resp: GetSessionResponse) => resp.session
  );

  // If the selected session no longer exists on the server redirect to start a new session
  if (!session) {
    redirect("/", RedirectType.push);
  }

  const requestId = active.requestId;

  const enhancedSession = await getAuthMethodsAndUser(session);
  return { ...enhancedSession, requestId };
}

export type SessionWithAuthData = Session & {
  authMethods: AuthenticationMethodType[];
  phoneVerified: boolean;
  emailVerified: boolean;
  requestId?: string;
};

async function getAuthMethodsAndUser(session?: Session): Promise<SessionWithAuthData> {
  const userId = session?.factors?.user?.id;

  if (!userId) {
    throw Error("Could not get user id from session");
  }

  const methods = await listAuthenticationMethodTypes(userId);

  const user = await getUserByID(userId);
  const humanUser = user.user?.type.case === "human" ? user.user?.type.value : undefined;

  return {
    ...session,
    authMethods: methods.authMethodTypes ?? [],
    phoneVerified: humanUser?.phone?.isVerified ?? false,
    emailVerified: humanUser?.email?.isVerified ?? false,
  };
}

/**
 * mfa is required, session is not valid anymore (e.g. session expired, user logged out, etc.)
 * to check for mfa for automatically selected session -> const response = await listAuthenticationMethodTypes(userId);
 **/
export async function isSessionValid({ session }: { session: Session }): Promise<boolean> {
  // session can't be checked without user
  if (!session.factors?.user) {
    logMessage.debug("Session has no user");
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
    logMessage.debug(`Session for ${session.factors.user.loginName} is expired: ${expirationInfo}`);
    return false;
  }

  // Password must be verified for a valid session
  const validPassword = !!session?.factors?.password?.verifiedAt;

  if (!validPassword) {
    logMessage.debug(
      `Session for ${session.factors.user.loginName} has no valid password verification`
    );
    return false;
  }

  // At least one MFA (TOTP or U2F) must be verified
  const totpValid = !!session.factors.totp?.verifiedAt;
  const u2fValid = !!session.factors.webAuthN?.verifiedAt;
  const optEmail = !!session.factors.otpEmail?.verifiedAt;
  const mfaValid = totpValid || u2fValid || optEmail;

  if (!mfaValid) {
    logMessage.debug(
      `Session for for ${session.factors.user.loginName} has no valid MFA factor (TOTP, U2F required)`
    );
    return false;
  }

  try {
    const userResponse = await getUserByID(session.factors.user.id);

    const humanUser =
      userResponse?.user?.type.case === "human" ? userResponse?.user.type.value : undefined;

    if (humanUser && !humanUser.email?.isVerified) {
      logMessage.debug(`Session invalid: Email not verified for user: ${session.factors.user.id}`);
      return false;
    }
  } catch (error) {
    logMessage.debug(
      `Session invalid: Could not load user ${session.factors.user.id} while validating email verification`
    );
    return false;
  }

  return true;
}

export async function findValidSession({
  sessions,
  authRequest,
}: {
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
    if (await isSessionValid({ session })) {
      return session;
    }
  }

  return undefined;
}
