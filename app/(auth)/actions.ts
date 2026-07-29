"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { redirect } from "next/navigation";
import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";

import { AuthenticatedAction } from "@lib/actions/authenticated";
import { getSessionCookieById, setSelectedSession } from "@lib/cookies";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { loginWithOIDCAndSession } from "@lib/oidc";
import { createSessionAndUpdateCookie } from "@lib/server/cookie";
import { isSessionValid } from "@lib/session";
import { buildUrlWithRequestId } from "@lib/utils";
import { validateUsernameAndPassword } from "@lib/validation/validationSchemas";
import {
  checkEmailVerification,
  checkMFAFactors,
  checkPasswordChangeRequired,
} from "@lib/verify-helper";
import { getSession, getUserByID, listAuthenticationMethodTypes } from "@lib/zitadel";
import { parseZitadelError } from "@lib/zitadel-errors";
import { serverTranslation } from "@i18n/server";

type SubmitLoginCommand = {
  username: string;
  password: string;
  requestId?: string;
};

/**
 * Handles combined username + password login in a single step
 * Returns generic error messages to prevent username enumeration
 */
export const submitLoginForm = async (command: SubmitLoginCommand): Promise<{ error: string }> => {
  const { t } = await serverTranslation("start");
  let accountLocked = false;

  const { username, password, requestId } = command;
  const validationResult = await validateUsernameAndPassword(command);

  if (!validationResult.success) {
    logMessage.warn("Server side validation failed for username and password");
    return {
      error: t("validation.invalidCredentials"),
    };
  }

  // Create session with combined username + password check
  const checks = create(ChecksSchema, {
    user: { search: { case: "loginName", value: username } },
    password: { password },
  });

  const session = await createSessionAndUpdateCookie({
    checks,
    requestId: command.requestId,
  }).catch(async (error) => {
    // Handle authentication failures with generic error message
    // This prevents username enumeration attacks

    const parsedError = parseZitadelError(error);

    if (parsedError.text.match("errors.user.notactive")) {
      accountLocked = true;
    }
  });

  if (accountLocked) {
    logMessage.debug("Account is locked");
    return { error: t("validation.lockedOut") };
  }

  if (!session) {
    // Always return generic error (don't reveal if user exists or password is wrong)
    logMessage.debug("Authentication failed, returning generic message");
    return { error: t("validation.invalidCredentials") };
  }

  if (!session?.factors?.user?.id) {
    logMessage.warn("Session created but no user ID found");
    return { error: t("validation.invalidCredentials") };
  }

  // Fetch user details
  const userResponse = await getUserByID(session.factors.user.id);

  if (!userResponse.user) {
    logMessage.warn("User not found after successful authentication");
    return { error: t("validation.invalidCredentials") };
  }

  const user = userResponse.user;
  const humanUser = user.type.case === "human" ? user.type.value : undefined;

  // Check if user is in initial state (not supported)
  if (user.state === UserState.INITIAL) {
    logMessage.warn("User in INITIAL state - not supported");
    return { error: t("validation.invalidCredentials") };
  }

  // Check email verification status
  const emailVerificationCheck = checkEmailVerification(session, humanUser, requestId);

  if (emailVerificationCheck?.redirect) {
    redirect(emailVerificationCheck?.redirect, "push");
  }

  // Check if password is expired and user has to change password first
  const passwordChangedCheck = await checkPasswordChangeRequired(
    session,
    humanUser,
    command.requestId
  );
  if (passwordChangedCheck?.redirect) {
    redirect(passwordChangedCheck.redirect, "push");
  }

  // Get authentication methods for MFA check
  const response = await listAuthenticationMethodTypes(session.factors.user.id);

  const authMethods = response.authMethodTypes ?? [];

  if (authMethods.length === 0) {
    logMessage.error("No authentication methods found for user");
    return { error: t("validation.invalidCredentials") };
  }

  // Check MFA requirements and redirect appropriately
  const mfaFactorCheck = await checkMFAFactors(authMethods, requestId);

  if ("error" in mfaFactorCheck) {
    logMessage.error(`MFA factor check failed: ${mfaFactorCheck.error}`);
    return { error: t("validation.invalidCredentials") };
  }

  if ("redirect" in mfaFactorCheck) {
    redirect(mfaFactorCheck.redirect, "push");
  }

  // If no MFA redirect, authentication is complete
  logMessage.info("Login successful, redirecting to account page");
  redirect(buildUrlWithRequestId("/account", requestId), "push");
};

// Unauthenticated Action to ensure a user can select an existing non-active session
export const setSession = async (sessionId: string) => {
  return setSelectedSession(sessionId);
};

export const continueOidcSessionSelection = async (sessionId: string, requestId: string) => {
  await setSelectedSession(sessionId);

  const sessionCookie = await getSessionCookieById({ sessionId }).catch(() => null);
  if (!sessionCookie) {
    return { error: "Session not found or invalid" };
  }

  const sessionResponse = await getSession(sessionCookie.id, sessionCookie.token).catch(() => null);
  if (!sessionResponse?.session) {
    return { error: "Session not found or invalid" };
  }

  return loginWithOIDCAndSession({
    authRequest: requestId,
    sessionId,
    sessions: [sessionResponse.session],
    sessionCookies: [sessionCookie],
  });
};

export const checkActiveSession = AuthenticatedAction(async function checkActiveSession(session) {
  return isSessionValid({ session });
});
