"use server";

/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/

import { create } from "@zitadel/client";
import { ChecksSchema } from "@zitadel/proto/zitadel/session/v2/session_service_pb";
import { UserState } from "@zitadel/proto/zitadel/user/v2/user_pb";

import { validateUsernameAndPassword } from "@lib/client/validationSchemas";
import { setSelectedSession } from "@lib/cookies";
/*--------------------------------------------*
 * Internal Aliases
 *--------------------------------------------*/
import { logMessage } from "@lib/logger";
import { createSessionAndUpdateCookie, CreateSessionFailedError } from "@lib/server/cookie";
import { isSessionValid, loadActiveSession } from "@lib/session";
import { buildUrlWithRequestId } from "@lib/utils";
import { checkEmailVerification, checkMFAFactors } from "@lib/verify-helper";
import { getLockoutSettings, getUserByID, listAuthenticationMethodTypes } from "@lib/zitadel";
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
export const submitLoginForm = async (
  command: SubmitLoginCommand
): Promise<{ error: string } | { redirect: string }> => {
  const { t } = await serverTranslation("start");

  const validationResult = await validateUsernameAndPassword(command);

  if (!validationResult.success) {
    logMessage.warn("Server side validation failed for username and password");
    return {
      error: t("validation.invalidCredentials"),
    };
  }

  // Create session with combined username + password check
  const checks = create(ChecksSchema, {
    user: { search: { case: "loginName", value: command.username } },
    password: { password: command.password },
  });

  let session;

  try {
    session = await createSessionAndUpdateCookie({
      checks,
      requestId: command.requestId,
    });
  } catch (error: unknown) {
    // Handle authentication failures with generic error message
    // This prevents username enumeration attacks
    const errorDetail = error as CreateSessionFailedError;

    // Log failed attempt count if available (for monitoring)
    if ("failedAttempts" in errorDetail && errorDetail.failedAttempts) {
      const lockoutSettings = await getLockoutSettings();

      logMessage.warn(
        `Login failed - Attempt ${errorDetail.failedAttempts}${lockoutSettings?.maxPasswordAttempts ? ` of ${lockoutSettings.maxPasswordAttempts}` : ""}`
      );

      // Check if account is locked
      const hasLimit =
        lockoutSettings?.maxPasswordAttempts !== undefined &&
        lockoutSettings?.maxPasswordAttempts > BigInt(0);
      const locked = hasLimit && errorDetail.failedAttempts >= lockoutSettings?.maxPasswordAttempts;

      if (locked) {
        logMessage.error("Account locked due to too many failed attempts");
      }
    }

    // Always return generic error (don't reveal if user exists or password is wrong)
    logMessage.info("Authentication failed, returning generic message");
    return { error: t("validation.invalidCredentials") };
  }

  if (!session?.factors?.user?.id) {
    logMessage.error("Session created but no user ID found");
    return { error: t("validation.invalidCredentials") };
  }

  // Fetch user details
  const userResponse = await getUserByID(session.factors.user.id);

  if (!userResponse.user) {
    logMessage.error("User not found after successful authentication");
    return { error: t("validation.invalidCredentials") };
  }

  const user = userResponse.user;
  const humanUser = user.type.case === "human" ? user.type.value : undefined;

  // Check if user is in initial state (not supported)
  if (user.state === UserState.INITIAL) {
    logMessage.error("User in INITIAL state - not supported");
    return { error: t("validation.invalidCredentials") };
  }

  // Check email verification status
  const emailVerificationCheck = checkEmailVerification(session, humanUser, command.requestId);

  if (emailVerificationCheck?.redirect) {
    return emailVerificationCheck;
  }

  // Get authentication methods for MFA check
  const response = await listAuthenticationMethodTypes(session.factors.user.id);

  const authMethods = response.authMethodTypes ?? [];

  if (authMethods.length === 0) {
    logMessage.error("No authentication methods found for user");
    return { error: t("validation.invalidCredentials") };
  }

  // Check MFA requirements and redirect appropriately
  const mfaFactorCheck = await checkMFAFactors(authMethods, command.requestId);

  if ("error" in mfaFactorCheck) {
    logMessage.error(`MFA factor check failed: ${mfaFactorCheck.error}`);
    return { error: t("validation.invalidCredentials") };
  }

  if ("redirect" in mfaFactorCheck) {
    return mfaFactorCheck;
  }

  // If no MFA redirect, authentication is complete
  logMessage.info("Login successful, redirecting to account page");
  return { redirect: buildUrlWithRequestId("/account", command.requestId) };
};

export const setSession = async (sessionId: string) => {
  return setSelectedSession(sessionId);
};

export const checkActiveSession = async () => {
  const session = await loadActiveSession();
  return isSessionValid({ session });
};
